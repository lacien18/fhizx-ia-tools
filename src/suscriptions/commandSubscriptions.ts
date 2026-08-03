import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { FileManagerService } from "../services/fileManagerService";
import {
  CATEGORIES,
  COMMANDS,
  COMMAND_PREFIX,
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  capitalizeCategory,
} from "../constants";

export function registerCommands(
  context: vscode.ExtensionContext,
  fileManager: FileManagerService,
  refreshAll: () => void,
) {
  const categories = CATEGORIES;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.SEND_TO_CHAT,
      async (node?: WorkspaceItem | vscode.Uri) => {
        let filePath = "";
        if (node && "resourceUri" in node) filePath = node.resourceUri.fsPath;
        else if (node instanceof vscode.Uri) filePath = node.fsPath;
        else if (vscode.window.activeTextEditor)
          filePath = vscode.window.activeTextEditor.document.fileName;

        if (!filePath || !fs.existsSync(filePath)) {
          vscode.window.showWarningMessage(
            "Por favor selecciona o abre un archivo válido para enviar al chat.",
          );
          return;
        }

        const content = fs.readFileSync(filePath, "utf-8");
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
        let filePath = "";
        if (node && "resourceUri" in node) filePath = node.resourceUri.fsPath;
        else if (node instanceof vscode.Uri) filePath = node.fsPath;
        else if (vscode.window.activeTextEditor)
          filePath = vscode.window.activeTextEditor.document.fileName;

        if (!filePath || !fs.existsSync(filePath)) {
          return;
        }

        const content = fs.readFileSync(filePath, "utf-8");
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
      if (uri && uri[0]) {
        const selectedPath = uri[0].fsPath;
        await vscode.workspace
          .getConfiguration(CONFIG_NAMESPACE)
          .update(
            CONFIG_KEYS.GLOBAL_PATH,
            selectedPath,
            vscode.ConfigurationTarget.Global,
          );

        for (const cat of categories) {
          const subPath = path.join(selectedPath, cat);
          if (!fs.existsSync(subPath))
            fs.mkdirSync(subPath, { recursive: true });
        }

        vscode.window.showInformationMessage(
          `Ruta global configurada en: ${selectedPath}`,
        );
        refreshAll();
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

        fs.renameSync(oldPath, newPath);
        refreshAll();
        vscode.window.showInformationMessage(
          "Elemento modificado exitosamente.",
        );
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
        if (confirm === "Eliminar") {
          if (node.isFolder)
            fs.rmSync(node.resourceUri.fsPath, {
              recursive: true,
              force: true,
            });
          else fs.unlinkSync(node.resourceUri.fsPath);
          refreshAll();
          vscode.window.showInformationMessage("Elemento eliminado.");
        }
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.INSTALL_ITEM,
      async (node: WorkspaceItem) => {
        if (node && node.category) {
          const { InstallationService } =
            await import("../services/installationService");
          await InstallationService.installItem(node, node.category);
          refreshAll();
        }
      },
    ),

    vscode.commands.registerCommand(
      COMMANDS.UNINSTALL_ITEM,
      async (node: WorkspaceItem) => {
        if (node && node.category) {
          const { InstallationService } =
            await import("../services/installationService");
          await InstallationService.uninstallItem(node, node.category);
          refreshAll();
        }
      },
    ),

    vscode.commands.registerCommand(COMMANDS.CHECK_FOR_UPDATES, () => {
      vscode.window.showInformationMessage(
        "FhizxAITools se encuentra actualizado.",
      );
    }),
  );
}
