import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { FileManagerService } from "../services/fileManagerService";
import { InstallationService } from "../services/installationService";
import { CloudSyncService } from "../services/cloudSyncService";
import { exportToPdf } from "../services/pdfExportService";
import {
  CATEGORIES,
  COMMANDS,
  COMMAND_PREFIX,
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  COPILOT_CATEGORIES,
  capitalizeCategory,
} from "../constants";
import { fileExists, deletePath, safeReadFile } from "../utils/fsUtils";
import {
  ensureGlobalStructure,
  getGlobalPathConfig,
  notifyFsError,
  resolveResourceFilePath,
} from "../utils/resourceUtils";

interface ResourceQuickPickItem extends vscode.QuickPickItem {
  resource: WorkspaceItem;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  fileManager: FileManagerService,
  refreshAll: () => void,
  cloudService: CloudSyncService,
) {
  const categories = CATEGORIES;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.SEND_TO_CHAT,
      async (node?: WorkspaceItem | vscode.Uri) => {
        const filePath = resolveResourceFilePath(node);
        if (!filePath || !fileExists(filePath)) {
          vscode.window.showWarningMessage(
            "Por favor selecciona o abre un archivo válido para enviar al chat.",
          );
          return;
        }

        const content = safeReadFile(filePath);
        if (!content) return;
        const fileName = path.basename(filePath);

        try {
          await vscode.commands.executeCommand(COMMANDS.WORKBENCH_CHAT_OPEN, {
            query: `Usa el siguiente recurso (${fileName}):\n\n${content}`,
            isPartialQuery: true,
          });
        } catch {
          // Fallback if chat doesn't support query or something goes wrong
          await vscode.env.clipboard.writeText(content);
          vscode.commands.executeCommand(COMMANDS.WORKBENCH_CHAT_OPEN);
          vscode.window.showInformationMessage(
            `El contenido de "${fileName}" se copió al portapapeles.`,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.COPY_TO_CLIPBOARD,
      async (node?: WorkspaceItem | vscode.Uri) => {
        const filePath = resolveResourceFilePath(node);
        if (!filePath || !fileExists(filePath)) return;
        const content = safeReadFile(filePath);
        if (!content) return;
        await vscode.env.clipboard.writeText(content);
      },
    ),

    vscode.commands.registerCommand(COMMANDS.REFRESH, () => {
      refreshAll();
      vscode.window.showInformationMessage("Archivos y carpetas actualizadas");
    }),

    vscode.commands.registerCommand(COMMANDS.SET_GLOBAL_PATH, async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (!uri || !uri[0]) return;
      const selectedPath = uri[0].fsPath;

      try {
        await vscode.workspace
          .getConfiguration(CONFIG_NAMESPACE)
          .update(
            CONFIG_KEYS.GLOBAL_PATH,
            selectedPath,
            vscode.ConfigurationTarget.Global,
          );
        ensureGlobalStructure(selectedPath);

        vscode.window.showInformationMessage(
          `Ruta global configurada en: ${selectedPath}`,
        );
        refreshAll();
      } catch (error) {
        notifyFsError("No se pudo configurar la ruta global", error);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_GLOBAL_PATH, async () => {
      const globalPath = getGlobalPathConfig();
      if (!globalPath) {
        vscode.window.showWarningMessage(
          "Configura la ruta global para poder abrirla.",
        );
        return;
      }

      try {
        if (!fs.existsSync(globalPath)) {
          fs.mkdirSync(globalPath, { recursive: true });
        }
        await vscode.commands.executeCommand(
          "revealFileInOS",
          vscode.Uri.file(globalPath),
        );
      } catch (error) {
        notifyFsError("No se pudo abrir la ruta global", error);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_FILE, (uri: vscode.Uri) =>
      vscode.window.showTextDocument(uri),
    ),

    vscode.commands.registerCommand(
      COMMANDS.PREVIEW_MARKDOWN,
      async (node?: WorkspaceItem | vscode.Uri) => {
        const filePath = resolveResourceFilePath(node);
        if (!filePath || !fileExists(filePath)) {
          vscode.window.showWarningMessage(
            "Por favor selecciona o abre un archivo válido para previsualizar.",
          );
          return;
        }
        const uri = vscode.Uri.file(filePath);
        try {
          await vscode.commands.executeCommand("markdown.showPreview", uri);
        } catch (error) {
          notifyFsError(
            "No se pudo abrir la previsualización de Markdown",
            error,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.EXPORT_TO_PDF,
      (node?: WorkspaceItem | vscode.Uri) => {
        const filePath = resolveResourceFilePath(node);
        if (!filePath || !fileExists(filePath)) {
          vscode.window.showWarningMessage(
            "Por favor selecciona o abre un archivo válido para exportar.",
          );
          return;
        }
        exportToPdf(filePath);
      },
    ),

    // Generadores dinámicos para comandos específicos
    ...categories.flatMap((cat) => {
      const commandName = capitalizeCategory(cat);
      return [
        vscode.commands.registerCommand(
          `${COMMAND_PREFIX.CREATE}${commandName}${COMMAND_PREFIX.SUFFIX_FILE}`,
          () => fileManager.createNewFile(cat, refreshAll),
        ),
        vscode.commands.registerCommand(
          `${COMMAND_PREFIX.CREATE}${commandName}${COMMAND_PREFIX.SUFFIX_FOLDER}`,
          () => fileManager.createNewFolder(cat, refreshAll),
        ),
      ];
    }),

    vscode.commands.registerCommand(
      COMMANDS.CREATE_FILE_CONTEXT,
      (node: WorkspaceItem) =>
        fileManager.createNewFile("prompts", refreshAll, node),
    ),
    vscode.commands.registerCommand(
      COMMANDS.CREATE_FOLDER_CONTEXT,
      (node: WorkspaceItem) =>
        fileManager.createNewFolder("prompts", refreshAll, node),
    ),

    vscode.commands.registerCommand(
      COMMANDS.RENAME_ITEM,
      async (node: WorkspaceItem) => {
        if (!node) return;
        const oldPath = node.resourceUri.fsPath;
        const parsedPath = path.parse(oldPath);
        const newName = await vscode.window.showInputBox({
          prompt: "Modificar nombre",
          value: parsedPath.name,
        });
        if (!newName) return;

        const finalNewName = newName.endsWith(parsedPath.ext)
          ? newName
          : `${newName}${parsedPath.ext}`;
        const newPath = path.join(parsedPath.dir, finalNewName);

        if (fs.existsSync(newPath)) {
          vscode.window.showErrorMessage(
            "Ya existe un elemento con ese nombre.",
          );
          return;
        }

        try {
          fs.renameSync(oldPath, newPath);
          refreshAll();
          cloudService.scheduleExplicitPush();
          vscode.window.showInformationMessage(
            "Elemento modificado exitosamente.",
          );
        } catch (error) {
          notifyFsError("No se pudo modificar el nombre", error);
        }
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.DELETE_ITEM,
      async (node: WorkspaceItem) => {
        if (!node) return;
        const confirm = await vscode.window.showWarningMessage(
          `¿Deseas eliminar "${node.label}"?`,
          { modal: true },
          "Eliminar",
        );
        if (confirm !== "Eliminar") return;

        try {
          deletePath(node.resourceUri.fsPath, node.isFolder);
          refreshAll();
          cloudService.scheduleExplicitPush();
          vscode.window.showInformationMessage("Elemento eliminado.");
        } catch (error) {
          notifyFsError("No se pudo eliminar el elemento", error);
        }
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.INSTALL_ITEM,
      async (node: WorkspaceItem) => {
        if (!node || !node.category) return;
        await InstallationService.installItem(node, node.category);
        refreshAll();
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.UNINSTALL_ITEM,
      async (node: WorkspaceItem) => {
        if (!node || !node.category) return;
        await InstallationService.uninstallItem(node, node.category);
        refreshAll();
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.TOGGLE_INSTALL,
      async (node?: WorkspaceItem) => {
        // Con nodo (menú contextual de un recurso): alterna su instalación.
        if (node && node.category) {
          await InstallationService.toggleItem(node, node.category);
          refreshAll();
          return;
        }

        // Sin nodo (vista Configurations): QuickPick con los recursos disponibles.
        const globalPath = getGlobalPathConfig();
        if (!globalPath) {
          vscode.window.showWarningMessage(
            "Configura la ruta global para gestionar recursos.",
          );
          return;
        }

        const candidates: WorkspaceItem[] = [];
        for (const cat of COPILOT_CATEGORIES) {
          const catDir = path.join(globalPath, cat);
          if (!fs.existsSync(catDir)) continue;
          const entries = fs.readdirSync(catDir, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isFile()) continue;
            candidates.push(
              new WorkspaceItem(
                entry.name,
                vscode.Uri.file(path.join(catDir, entry.name)),
                vscode.TreeItemCollapsibleState.None,
                false,
                cat,
                InstallationService.isInstalled(entry.name, cat),
              ),
            );
          }
        }

        if (candidates.length === 0) {
          vscode.window.showInformationMessage(
            "No hay recursos para instalar en Copilot.",
          );
          return;
        }

        const quickPick =
          vscode.window.createQuickPick<ResourceQuickPickItem>();
        quickPick.title = "Instalar / Desinstalar en Copilot";
        quickPick.placeholder =
          "Selecciona un recurso para alternar su instalación";
        quickPick.items = candidates.map((resource) => ({
          label: resource.label,
          description: resource.category,
          detail: resource.isInstalled ? "✅ Instalado" : "❌ No instalado",
          resource,
        }));

        quickPick.onDidAccept(() => {
          const selected = quickPick.selectedItems[0];
          if (selected) {
            void InstallationService.toggleItem(
              selected.resource,
              selected.resource.category,
            ).then(() => refreshAll());
          }
          quickPick.dispose();
        });
        quickPick.show();
      },
    ),

    vscode.commands.registerCommand(COMMANDS.CHECK_FOR_UPDATES, async () => {
      const localVersion = context.extension.packageJSON.version as
        | string
        | undefined;
      if (!localVersion) return;

      const configured = await cloudService.isConfigured();
      if (!configured) {
        vscode.window.showWarningMessage(
          "Conecta la nube (GitHub) para buscar actualizaciones.",
        );
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Buscando actualizaciones de FhizxAITools…",
          cancellable: false,
        },
        async (progress) => {
          try {
            const owner = cloudService.getOwner();
            const repo = cloudService.getRepo();
            const token = await cloudService.getToken();
            if (!token) return;

            progress.report({ message: "Consultando repositorio…" });

            // List repo contents at root to find .vsix files
            const tree = await ghRequest<{
              tree: { path: string; sha: string; type: string }[];
            }>(`/repos/${owner}/${repo}/git/trees/main?recursive=1`, token);
            if (!tree?.tree) {
              vscode.window.showWarningMessage(
                "No se pudo consultar el repositorio de actualizaciones.",
              );
              return;
            }

            const vsixFiles = tree.tree.filter(
              (f) =>
                f.type === "blob" &&
                f.path.endsWith(".vsix") &&
                f.path.includes("fhizx-ai-tools-manager-"),
            );

            if (vsixFiles.length === 0) {
              vscode.window.showInformationMessage(
                "No hay versiones .vsix en el repositorio.",
              );
              return;
            }

            // Parse versions from filenames and find the latest
            const parsed = vsixFiles
              .map((f) => {
                const match = f.path.match(
                  /fhizx-ai-tools-manager-(\d+\.\d+\.\d+)\.vsix$/,
                );
                return match
                  ? { path: f.path, sha: f.sha, version: match[1] }
                  : null;
              })
              .filter(Boolean) as {
              path: string;
              sha: string;
              version: string;
            }[];

            if (parsed.length === 0) {
              vscode.window.showInformationMessage(
                "No se encontraron versiones válidas en el repositorio.",
              );
              return;
            }

            parsed.sort((a, b) => compareVersions(b.version, a.version));
            const latest = parsed[0];

            if (latest.version === localVersion) {
              vscode.window.showInformationMessage(
                `FhizxAITools ${localVersion} se encuentra actualizado.`,
              );
              return;
            }

            if (compareVersions(latest.version, localVersion) <= 0) {
              vscode.window.showInformationMessage(
                `FhizxAITools ${localVersion} se encuentra actualizado.`,
              );
              return;
            }

            const action = await vscode.window.showInformationMessage(
              `FhizxAITools ${localVersion} → hay una versión nueva: ${latest.version}`,
              "Instalar ahora",
            );
            if (action !== "Instalar ahora") return;

            progress.report({ message: "Descargando .vsix…" });

            // Download blob content (base64)
            const blob = await ghRequest<{ content: string }>(
              `/repos/${owner}/${repo}/git/blobs/${latest.sha}`,
              token,
            );
            if (!blob?.content) {
              vscode.window.showErrorMessage(
                "No se pudo descargar el archivo .vsix.",
              );
              return;
            }

            const tmpDir = require("os").tmpdir();
            const tmpFile = require("path").join(
              tmpDir,
              `fhizx-ai-tools-manager-${latest.version}.vsix`,
            );
            require("fs").writeFileSync(
              tmpFile,
              Buffer.from(blob.content, "base64"),
            );

            progress.report({ message: "Instalando extensión…" });

            await vscode.commands.executeCommand(
              "workbench.extensions.installExtension",
              vscode.Uri.file(tmpFile),
            );

            const reload = await vscode.window.showInformationMessage(
              `FhizxAITools ${latest.version} instalado. Recarga la ventana para activar.`,
              "Recargar",
            );
            if (reload === "Recargar") {
              void vscode.commands.executeCommand(
                "workbench.action.reloadWindow",
              );
            }
          } catch (error) {
            notifyFsError("No se pudo buscar actualizaciones", error);
          }
        },
      );
    }),

    // ------------------------------------------------------------------
    // Nube gratuita (GitHub)
    // ------------------------------------------------------------------

    vscode.commands.registerCommand(COMMANDS.CLOUD_CONNECT, async () => {
      const owner = await vscode.window.showInputBox({
        title: "Conectar a Nube (GitHub)",
        prompt: "Usuario u organización de GitHub",
        placeHolder: "ej. tu-usuario",
        ignoreFocusOut: true,
      });
      if (!owner?.trim()) return;

      const repo = await vscode.window.showInputBox({
        title: "Conectar a Nube (GitHub)",
        prompt: "Nombre del repositorio privado (se creará si no existe)",
        placeHolder: "fhizx-ai-tools-backup",
        ignoreFocusOut: true,
      });
      const repoName = repo?.trim() || "fhizx-ai-tools-backup";

      const token = await vscode.window.showInputBox({
        title: "Conectar a Nube (GitHub)",
        prompt:
          "Personal Access Token (clásico, con permiso 'repo'). Crea uno en github.com/settings/tokens",
        password: true,
        ignoreFocusOut: true,
      });
      if (!token?.trim()) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Conectando con GitHub…",
        },
        async () => {
          try {
            const { created, defaultBranch } = await cloudService.connect(
              owner.trim(),
              repoName,
              token.trim(),
            );
            vscode.window.showInformationMessage(
              created
                ? `Repositorio privado "${owner.trim()}/${repoName}" creado en GitHub.`
                : `Conectado a "${owner.trim()}/${repoName}" (rama ${defaultBranch}).`,
            );
            refreshAll();

            const subir = await vscode.window.showInformationMessage(
              "¿Quieres subir tus archivos locales a la nube ahora?",
              "Subir ahora",
            );
            if (subir === "Subir ahora") {
              await vscode.commands.executeCommand(COMMANDS.CLOUD_PUSH);
            }
          } catch (error) {
            notifyFsError("No se pudo conectar con GitHub", error);
          }
        },
      );
    }),

    vscode.commands.registerCommand(COMMANDS.CLOUD_PUSH, async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Subiendo archivos a la nube…",
        },
        async (progress) => {
          try {
            const { uploaded } = await cloudService.pushToCloud((msg) =>
              progress.report({ message: msg }),
            );
            vscode.window.showInformationMessage(
              `Se subieron ${uploaded} archivo(s) a la nube.`,
            );
            refreshAll();
          } catch (error) {
            notifyFsError("No se pudo subir a la nube", error);
          }
        },
      );
    }),

    vscode.commands.registerCommand(COMMANDS.CLOUD_PULL, async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Bajando archivos desde la nube…",
        },
        async (progress) => {
          try {
            const { downloaded } = await cloudService.pullFromCloud((msg) =>
              progress.report({ message: msg }),
            );
            vscode.window.showInformationMessage(
              `Se descargaron ${downloaded} archivo(s) desde la nube.`,
            );
            refreshAll();
          } catch (error) {
            notifyFsError("No se pudo bajar desde la nube", error);
          }
        },
      );
    }),

    vscode.commands.registerCommand(COMMANDS.CLOUD_DISCONNECT, async () => {
      const confirm = await vscode.window.showWarningMessage(
        "¿Desconectar la nube? Tus archivos locales no se eliminarán.",
        { modal: true },
        "Desconectar",
      );
      if (confirm !== "Desconectar") return;

      try {
        await cloudService.disconnect();
        vscode.window.showInformationMessage(
          "Nube desconectada. Tus archivos siguen en la ruta local.",
        );
        refreshAll();
      } catch (error) {
        notifyFsError("No se pudo desconectar la nube", error);
      }
    }),

    vscode.commands.registerCommand(
      COMMANDS.CLOUD_TOGGLE_AUTO_SYNC,
      async () => {
        const current = cloudService.getAutoSyncEnabled();
        await vscode.workspace
          .getConfiguration(CONFIG_NAMESPACE)
          .update(
            CONFIG_KEYS.CLOUD_AUTO_SYNC,
            !current,
            vscode.ConfigurationTarget.Global,
          );
        vscode.window.showInformationMessage(
          `Auto-sincronización ${!current ? "activada" : "desactivada"}.`,
        );
        refreshAll();
      },
    ),
  );
}

/**
 * Simple semver comparison. Returns >0 if a > b, <0 if a < b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Make a GitHub API request with token auth. Returns parsed JSON or undefined.
 */
function ghRequest<T>(apiPath: string, token: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: apiPath,
        method: "GET",
        timeout: 15000,
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "fhizx-ai-tools-manager",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            resolve(undefined);
          }
        });
      },
    );
    req.on("error", () => resolve(undefined));
    req.on("timeout", () => {
      req.destroy();
      resolve(undefined);
    });
    req.end();
  });
}
