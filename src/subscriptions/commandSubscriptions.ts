import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { FileManagerService } from "../services/fileManagerService";
import { InstallationService } from "../services/installationService";
import { CloudSyncService } from "../services/cloudSyncService";
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

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Buscando actualizaciones de FhizxAITools…",
        },
        async () => {
          const latest = await fetchLatestMarketplaceVersion(
            "undefined_publisher.fhizx-ai-tools-manager",
          );
          if (!latest) {
            vscode.window.showInformationMessage(
              "No se pudo verificar actualizaciones (extensión no publicada o sin conexión).",
            );
            return;
          }
          if (latest !== localVersion) {
            const action = await vscode.window.showInformationMessage(
              `FhizxAITools ${localVersion} — hay una versión nueva: ${latest}.`,
              "Ver en Marketplace",
            );
            if (action) {
              void vscode.env.openExternal(
                vscode.Uri.parse(
                  "https://marketplace.visualstudio.com/items?itemName=undefined_publisher.fhizx-ai-tools-manager",
                ),
              );
            }
          } else {
            vscode.window.showInformationMessage(
              `FhizxAITools ${localVersion} se encuentra actualizado.`,
            );
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
  );
}

/**
 * Consulta la última versión publicada de una extensión en el Marketplace
 * de VS Code (API pública de extensionquery). Devuelve `undefined` si falla.
 */
function fetchLatestMarketplaceVersion(
  extensionId: string,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
      flags: 0x1,
    });

    const req = https.request(
      {
        hostname: "marketplace.visualstudio.com",
        path: "/_apis/public/gallery/extensionquery",
        method: "POST",
        timeout: 8000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json;api-version=3.0-preview.1",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(
              json?.results?.[0]?.extensions?.[0]?.versions?.[0]?.version as
                | string
                | undefined,
            );
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
    req.write(body);
    req.end();
  });
}
