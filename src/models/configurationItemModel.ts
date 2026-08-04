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
    // El contextValue se deriva de `kind` para que los menús de package.json
    // (`config_info`, `config_status`, `config_action`) se activen correctamente.
    this.contextValue = `config_${kind}`;
    if (iconName) this.iconPath = new vscode.ThemeIcon(iconName);
    if (command) this.command = command;
  }
}
