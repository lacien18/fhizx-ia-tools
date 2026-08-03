import * as vscode from "vscode";

export type ConfigurationItemKind = "info" | "status" | "action";

export class ConfigurationItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    iconName: string,
    public readonly kind: ConfigurationItemKind,
    command?: vscode.Command,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.tooltip = description;
    this.contextValue = `config_info`;
    if (iconName) this.iconPath = new vscode.ThemeIcon(iconName);
    if (command) this.command = command;
  }
}
