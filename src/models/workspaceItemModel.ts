import * as vscode from "vscode";
import { COMMANDS } from "../constants";

export class WorkspaceItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFolder: boolean,
    public readonly category: string = "",
    public readonly isInstalled: boolean = false,
  ) {
    super(resourceUri, collapsibleState);

    if (isFolder) {
      this.contextValue = "folder";
    } else {
      this.contextValue = isInstalled ? "file_installed" : "file_uninstalled";

      if (category !== "notes") {
        // Configurar iconos para mostrar el estado de instalación (verde si instalado, rojo si no)
        if (isInstalled) {
          this.iconPath = new vscode.ThemeIcon(
            "testing-passed-icon",
            new vscode.ThemeColor("testing.iconPassed"),
          );
        } else {
          this.iconPath = new vscode.ThemeIcon(
            "notebook-state-error",
            new vscode.ThemeColor("testing.iconFailed"),
          );
        }
      }

      this.command = {
        command: COMMANDS.OPEN_FILE,
        title: "Abrir Archivo",
        arguments: [resourceUri],
      };
    }
  }
}
