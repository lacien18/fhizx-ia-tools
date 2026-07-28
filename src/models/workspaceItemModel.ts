import * as vscode from "vscode";

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

    if (isFolder || category == "notes") {
      this.contextValue = "folder";
    } else {
      this.contextValue = isInstalled ? "file_installed" : "file_uninstalled";

      // Configurar iconos para mostrar el estado de instalación (verde si instalado, rojo si no)
      if (isInstalled) {
        this.iconPath = new vscode.ThemeIcon(
          "check",
          new vscode.ThemeColor("testing.iconPassed"),
        );
      } else {
        this.iconPath = new vscode.ThemeIcon(
          "close",
          new vscode.ThemeColor("testing.iconFailed"),
        );
      }

      this.command = {
        command: "fhizxAiTools.openFile",
        title: "Abrir Archivo",
        arguments: [resourceUri],
      };
    }
  }
}
