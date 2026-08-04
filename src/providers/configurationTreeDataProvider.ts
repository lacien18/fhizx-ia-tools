import * as vscode from "vscode";
import { ConfigurationItem } from "../models/configurationItemModel";
import { COMMANDS, CONFIG_NAMESPACE, CONFIG_KEYS, ICONS } from "../constants";

export class ConfigurationTreeDataProvider implements vscode.TreeDataProvider<ConfigurationItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ConfigurationItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    // Refresca la vista cuando cambia la configuración (ej. nueva ruta global)
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
        this.refresh();
      }
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConfigurationItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ConfigurationItem[]> {
    const items: ConfigurationItem[] = [
      new ConfigurationItem(
        "🔥 ACCIONES",
        "",
        "view-pane-container-expanded",
        "info",
      ),
      new ConfigurationItem(
        "🗃️ Seleccionar Ruta Global",
        "- Elige la carpeta donde se guardarán prompts, agents, skills, context y notas.",
        "",
        "info",
        {
          command: COMMANDS.SET_GLOBAL_PATH,
          title: "Seleccionar Ruta Global",
        },
      ),
      new ConfigurationItem(
        "🔄 Recargar",
        "- Actualiza todas las vistas (prompts, agents, skills, context, notes y configuración).",
        "",
        "info",
        {
          command: COMMANDS.REFRESH,
          title: "Recargar",
        },
      ),
      new ConfigurationItem(
        "📦 Instalar / Desinstalar en Copilot",
        "- Alterna la instalación de un recurso en Copilot.",
        "",
        "info",
        {
          command: COMMANDS.TOGGLE_INSTALL,
          title: "Instalar / Desinstalar en Copilot",
        },
      ),
      new ConfigurationItem(
        "🗂️ RUTA GLOBAL",
        "",
        "view-pane-container-expanded",
        "info",
      ),
    ];

    // 2. Estado de la ruta global
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const globalPath = config.get<string>(CONFIG_KEYS.GLOBAL_PATH);
    const isConfigured = !!globalPath && globalPath.trim() !== "";

    items.push(
      new ConfigurationItem(
        "",
        isConfigured
          ? `${globalPath}`
          : "Configura una ruta global para empezar a gestionar tus recursos.",
        isConfigured ? ICONS.PASSED : ICONS.ERROR,
        "status",
      ),
    );

    return items;
  }
}
