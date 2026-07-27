import * as vscode from "vscode";

export class WorkspaceItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFolder: boolean,
  ) {
    super(resourceUri, collapsibleState);
    this.contextValue = isFolder ? "folder" : "file";
    if (!isFolder) {
      this.command = {
        command: "fhizxAiTools.openFile",
        title: "Abrir Archivo",
        arguments: [resourceUri],
      };
    }
  }
}
