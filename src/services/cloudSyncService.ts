import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { CONFIG_KEYS, CONFIG_NAMESPACE } from "../constants";
import { getGlobalPathConfig } from "../utils/resourceUtils";
import { collectLocalFiles, diffLocalVsRemote } from "../utils/cloudUtils";

/**
 * Sincronización con una nube gratuita de GitHub (repositorio privado).
 *
 * - El token se guarda de forma segura en `context.secrets` (SecretStorage).
 * - El owner y repo se guardan en la configuración global `fhizxAiTools.cloud.*`.
 * - Push: Git Data API (blobs → árbol → commit → ref) en una sola operación,
 *   de modo que los archivos eliminados localmente también se borran en la nube.
 * - Pull: Git Trees API (recursive) + Git Blobs API (raw).
 */

const API_HOST = "api.github.com";
const USER_AGENT = "FhizxAITools-VSCode";
const TOKEN_SECRET_KEY = "fhizxAiTools.githubToken";
const AUTO_SYNC_DEBOUNCE_MS = 1500;

interface GitHubError extends Error {
  statusCode?: number;
}

interface GitHubTreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string;
}

interface GitHubRepoInfo {
  default_branch?: string;
  private?: boolean;
}

interface GitHubRef {
  object: { sha: string };
}

interface GitHubCommit {
  tree: { sha: string };
}

interface GitHubTreeBlob {
  path: string;
  type: string;
  sha: string;
}

interface GitHubTree {
  sha: string;
  tree: GitHubTreeBlob[];
}

/** Cliente HTTP mínimo para la API REST de GitHub. */
function apiRequest<T>(options: {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  token?: string;
  body?: unknown;
  raw?: boolean;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const payload =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: options.raw
        ? "application/vnd.github.raw"
        : "application/vnd.github+json",
    };
    if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
    if (payload !== undefined) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(payload));
    }

    const req = https.request(
      {
        hostname: API_HOST,
        path: options.path,
        method: options.method,
        timeout: 20000,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const data = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (options.raw) {
              resolve(data as T);
              return;
            }
            if (!data) {
              resolve(undefined as T);
              return;
            }
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              resolve(data as T);
            }
            return;
          }
          let message = `HTTP ${res.statusCode}`;
          try {
            const json = JSON.parse(data) as { message?: string };
            message = json?.message || message;
          } catch {
            /* conserva el mensaje por defecto */
          }
          const error = new Error(message) as GitHubError;
          error.statusCode = res.statusCode;
          reject(error);
        });
      },
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Tiempo de espera agotado al conectar con GitHub."));
    });
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

export class CloudSyncService {
  private _syncing = false;
  private _debounceTimer: NodeJS.Timeout | undefined;
  private _watcher: vscode.FileSystemWatcher | undefined;

  constructor(private context: vscode.ExtensionContext) {}

  // ------------------------------------------------------------------
  // Configuración y estado
  // ------------------------------------------------------------------

  getOwner(): string {
    return this.getStringConfig(CONFIG_KEYS.CLOUD_OWNER);
  }

  getRepo(): string {
    return this.getStringConfig(CONFIG_KEYS.CLOUD_REPO);
  }

  getAutoSyncEnabled(): boolean {
    return vscode.workspace
      .getConfiguration(CONFIG_NAMESPACE)
      .get<boolean>(CONFIG_KEYS.CLOUD_AUTO_SYNC, true);
  }

  async getToken(): Promise<string | undefined> {
    return this.context.secrets.get(TOKEN_SECRET_KEY);
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(
      this.getOwner() && this.getRepo() && (await this.getToken()),
    );
  }

  /** "owner/repo" si hay una nube conectada; undefined en caso contrario. */
  async getDisplayRepo(): Promise<string | undefined> {
    if (!(await this.isConfigured())) return undefined;
    return `${this.getOwner()}/${this.getRepo()}`;
  }

  private getStringConfig(key: string): string {
    const value = vscode.workspace
      .getConfiguration(CONFIG_NAMESPACE)
      .get<string>(key, "");
    return value?.trim() ?? "";
  }

  // ------------------------------------------------------------------
  // Conectar / desconectar
  // ------------------------------------------------------------------

  /**
   * Valida el token, garantiza que el repositorio privado exista (lo crea si
   * falta) y guarda la configuración. Devuelve la rama por defecto y si el
   * repositorio fue creado en esta llamada.
   */
  async connect(
    owner: string,
    repo: string,
    token: string,
  ): Promise<{ created: boolean; defaultBranch: string }> {
    const user = await apiRequest<{ login?: string }>({
      method: "GET",
      path: "/user",
      token,
    });
    if (!user?.login) {
      throw new Error("El token de GitHub no es válido o no tiene permisos.");
    }

    const { created, defaultBranch } = await this.ensureRepo(
      owner,
      repo,
      token,
    );

    await this.context.secrets.store(TOKEN_SECRET_KEY, token);
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    await config.update(
      CONFIG_KEYS.CLOUD_OWNER,
      owner,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      CONFIG_KEYS.CLOUD_REPO,
      repo,
      vscode.ConfigurationTarget.Global,
    );

    return { created, defaultBranch };
  }

  /** Elimina el token y limpia la configuración de nube. */
  async disconnect(): Promise<void> {
    await this.context.secrets.delete(TOKEN_SECRET_KEY);
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    await config.update(
      CONFIG_KEYS.CLOUD_OWNER,
      "",
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      CONFIG_KEYS.CLOUD_REPO,
      "",
      vscode.ConfigurationTarget.Global,
    );
  }

  /** Valida el acceso al repo; si no existe, lo crea como privado. */
  private async ensureRepo(
    owner: string,
    repo: string,
    token: string,
  ): Promise<{ created: boolean; defaultBranch: string }> {
    try {
      const info = await apiRequest<GitHubRepoInfo>({
        method: "GET",
        path: `/repos/${owner}/${repo}`,
        token,
      });
      return {
        created: false,
        defaultBranch: info.default_branch || "main",
      };
    } catch (err) {
      if ((err as GitHubError).statusCode === 404) {
        await apiRequest({
          method: "POST",
          path: "/user/repos",
          token,
          body: {
            name: repo,
            private: true,
            description: "Copia de seguridad de FhizxAITools (nube gratuita)",
          },
        });
        const info = await apiRequest<GitHubRepoInfo>({
          method: "GET",
          path: `/repos/${owner}/${repo}`,
          token,
        });
        return {
          created: true,
          defaultBranch: info.default_branch || "main",
        };
      }
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Push: local -> GitHub
  // ------------------------------------------------------------------

  async pushToCloud(
    report?: (message: string) => void,
  ): Promise<{ uploaded: number }> {
    const globalPath = getGlobalPathConfig();
    if (!globalPath) {
      throw new Error(
        "Configura la ruta global antes de sincronizar con la nube.",
      );
    }
    const owner = this.getOwner();
    const repo = this.getRepo();
    const token = await this.getToken();
    if (!owner || !repo || !token) {
      throw new Error("Conecta primero una nube (GitHub) para subir archivos.");
    }

    report?.("Leyendo archivos locales…");
    const localFiles = collectLocalFiles(globalPath);

    report?.("Subiendo archivos a GitHub…");
    const entries: GitHubTreeEntry[] = [];
    for (const rel of localFiles) {
      const abs = path.join(globalPath, ...rel.split("/"));
      const content = fs.readFileSync(abs);
      const blob = await apiRequest<{ sha: string }>({
        method: "POST",
        path: `/repos/${owner}/${repo}/git/blobs`,
        token,
        body: { content: content.toString("base64"), encoding: "base64" },
      });
      entries.push({ path: rel, mode: "100644", type: "blob", sha: blob.sha });
    }

    const { defaultBranch } = await this.ensureRepo(owner, repo, token);

    // Resuelve el commit actual como padre (404 = repositorio aún vacío).
    let parentSha: string | undefined;
    let baseTree: string | undefined;
    try {
      const ref = await apiRequest<GitHubRef>({
        method: "GET",
        path: `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
        token,
      });
      parentSha = ref.object.sha;
      const commit = await apiRequest<GitHubCommit>({
        method: "GET",
        path: `/repos/${owner}/${repo}/git/commits/${parentSha}`,
        token,
      });
      baseTree = commit.tree.sha;
    } catch (err) {
      if ((err as GitHubError).statusCode !== 404) throw err;
      // Primer commit: sin padre y sin árbol base.
    }

    // Al pasar `base_tree`, los archivos no incluidos en el nuevo árbol
    // (eliminados localmente) desaparecen también en la nube.
    const tree = await apiRequest<{ sha: string }>({
      method: "POST",
      path: `/repos/${owner}/${repo}/git/trees`,
      token,
      body: { base_tree: baseTree, tree: entries },
    });

    const commit = await apiRequest<{ sha: string }>({
      method: "POST",
      path: `/repos/${owner}/${repo}/git/commits`,
      token,
      body: {
        message: `Sincronización FhizxAITools: ${entries.length} archivo(s)`,
        tree: tree.sha,
        parents: parentSha ? [parentSha] : [],
      },
    });

    await apiRequest<GitHubRef>({
      method: "PATCH",
      path: `/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
      token,
      body: { sha: commit.sha, force: false },
    });

    return { uploaded: entries.length };
  }

  // ------------------------------------------------------------------
  // Pull: GitHub -> local
  // ------------------------------------------------------------------

  async pullFromCloud(
    report?: (message: string) => void,
  ): Promise<{ downloaded: number }> {
    const globalPath = getGlobalPathConfig();
    if (!globalPath) {
      throw new Error(
        "Configura la ruta global antes de sincronizar con la nube.",
      );
    }
    const owner = this.getOwner();
    const repo = this.getRepo();
    const token = await this.getToken();
    if (!owner || !repo || !token) {
      throw new Error("Conecta primero una nube (GitHub) para bajar archivos.");
    }

    report?.("Consultando archivos en GitHub…");
    const { defaultBranch } = await this.ensureRepo(owner, repo, token);
    const tree = await apiRequest<GitHubTree>({
      method: "GET",
      path: `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      token,
    });

    const remoteBlobs = (tree.tree ?? []).filter(
      (t) => t.type === "blob" && !t.path.startsWith(".git/"),
    );
    if (remoteBlobs.length === 0) {
      throw new Error(
        "El repositorio en la nube está vacío. Sube archivos primero.",
      );
    }

    const remoteFiles = remoteBlobs.map((t) => t.path);
    const localFiles = collectLocalFiles(globalPath);
    const { toDelete } = diffLocalVsRemote(localFiles, remoteFiles);

    // Evita que el watcher de auto-sync intente subir mientras escribimos.
    this._syncing = true;
    try {
      report?.("Descargando archivos desde GitHub…");
      for (const blob of remoteBlobs) {
        const abs = path.join(globalPath, ...blob.path.split("/"));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        const content = await apiRequest<string>({
          method: "GET",
          path: `/repos/${owner}/${repo}/git/blobs/${blob.sha}`,
          token,
          raw: true,
        });
        fs.writeFileSync(abs, content, "utf8");
      }

      for (const rel of toDelete) {
        const abs = path.join(globalPath, ...rel.split("/"));
        if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
      }
    } finally {
      this._syncing = false;
    }

    return { downloaded: remoteBlobs.length };
  }

  // ------------------------------------------------------------------
  // Auto-sincronización al detectar cambios en la ruta global
  // ------------------------------------------------------------------

  /**
   * Crea un watcher sobre la ruta global que sube los cambios a la nube tras
   * un pequeño debounce. Devuelve el disposable, o undefined si no aplica
   * (sin ruta global o auto-sync desactivado).
   */
  startAutoSync(): vscode.Disposable | undefined {
    this.stopAutoSync();

    const globalPath = getGlobalPathConfig();
    if (!globalPath) return undefined;
    if (!this.getAutoSyncEnabled()) return undefined;

    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(globalPath, "**"),
    );

    const schedule = () => {
      if (this._syncing) return;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = undefined;
        void this.autoPush();
      }, AUTO_SYNC_DEBOUNCE_MS);
    };

    this._watcher.onDidCreate(schedule);
    this._watcher.onDidChange(schedule);
    this._watcher.onDidDelete(schedule);
    return this._watcher;
  }

  stopAutoSync(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
    if (this._watcher) {
      this._watcher.dispose();
      this._watcher = undefined;
    }
  }

  private async autoPush(): Promise<void> {
    if (this._syncing) return;
    if (!(await this.isConfigured())) return;
    this._syncing = true;
    try {
      await this.pushToCloud();
    } catch (error) {
      console.warn("FhizxAITools: Auto-sincronización fallida", error);
      vscode.window.showWarningMessage(
        `FhizxAITools: No se pudo sincronizar con la nube: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this._syncing = false;
    }
  }
}
