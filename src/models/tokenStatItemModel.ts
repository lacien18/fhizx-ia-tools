import * as vscode from "vscode";

export class TokenStatItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly statDescription?: string,
    iconName?: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = statDescription;
    this.contextValue = "tokenStat";
    if (iconName) this.iconPath = new vscode.ThemeIcon(iconName);
  }
}
