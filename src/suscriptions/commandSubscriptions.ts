import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { FileManagerService } from "../services/fileManagerService";

export function registerCommands(
  context: vscode.ExtensionContext,
  fileManager: FileManagerService,
  refreshAll: () => void,
) {
  const categories: ("prompts" | "agents" | "skills" | "notes")[] = [
    "prompts",
    "agents",
    "skills",
    "notes",
  ];

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "fhizxAiTools.sendToChat",
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
          await vscode.commands.executeCommand("workbench.action.chat.open", {
            query: `Usa el siguiente recurso (${fileName}):\n\n${content}`,
            isPartialQuery: true,
          });
        } catch {
          // Fallback if chat doesn't support query or something goes wrong
          await vscode.env.clipboard.writeText(content);
          vscode.commands.executeCommand("workbench.action.chat.open");
          vscode.window.showInformationMessage(
            `El contenido de "${fileName}" se copió al portapapeles.`,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      "fhizxAiTools.copyToClipboard",
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

    vscode.commands.registerCommand("fhizxAiTools.refresh", () => {
      refreshAll();
      vscode.window.showInformationMessage("Archivos y carpetas actualizadas");
    }),

    vscode.commands.registerCommand("fhizxAiTools.setGlobalPath", async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (uri && uri[0]) {
        const selectedPath = uri[0].fsPath;
        await vscode.workspace
          .getConfiguration("fhizxAiTools")
          .update(
            "globalPath",
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

    vscode.commands.registerCommand(
      "fhizxAiTools.openFile",
      (uri: vscode.Uri) => vscode.window.showTextDocument(uri),
    ),

    // Generadores dinámicos para comandos específicos
    ...categories.flatMap((cat) => [
      vscode.commands.registerCommand(
        `fhizxAiTools.create${cat.charAt(0).toUpperCase() + cat.slice(1, -1)}File`,
        () => fileManager.createNewFile(cat, refreshAll),
      ),
      vscode.commands.registerCommand(
        `fhizxAiTools.create${cat.charAt(0).toUpperCase() + cat.slice(1, -1)}Folder`,
        () => fileManager.createNewFolder(cat, refreshAll),
      ),
    ]),

    vscode.commands.registerCommand(
      "fhizxAiTools.createFileContext",
      (node: WorkspaceItem) =>
        fileManager.createNewFile("prompts", refreshAll, node),
    ),
    vscode.commands.registerCommand(
      "fhizxAiTools.createFolderContext",
      (node: WorkspaceItem) =>
        fileManager.createNewFolder("prompts", refreshAll, node),
    ),

    vscode.commands.registerCommand(
      "fhizxAiTools.renameItem",
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
      "fhizxAiTools.deleteItem",
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
      "fhizxAiTools.installItem",
      async (node: WorkspaceItem) => {
        if (node && node.category) {
          const { InstallationService } = await import("../services/installationService");
          await InstallationService.installItem(node, node.category);
          refreshAll();
        }
      },
    ),

    vscode.commands.registerCommand(
      "fhizxAiTools.uninstallItem",
      async (node: WorkspaceItem) => {
        if (node && node.category) {
          const { InstallationService } = await import("../services/installationService");
          await InstallationService.uninstallItem(node, node.category);
          refreshAll();
        }
      },
    ),


    vscode.commands.registerCommand("fhizxAiTools.checkForUpdates", () => {
      vscode.window.showInformationMessage(
        "FhizxAITools se encuentra actualizado.",
      );
    }),
  );
}
