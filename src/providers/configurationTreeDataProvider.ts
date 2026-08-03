import * as vscode from "vscode";
import { ConfigurationItem } from "../models/configurationItemModel";
import { InstallationService } from "../services/installationService";
import { COMMANDS, CONFIG_NAMESPACE, CONFIG_KEYS } from "../constants";

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
      // 1. Explicación de la funcionalidad
      new ConfigurationItem(
        "ℹ️ ¿Qué es FhizxAITools?",
        "Gestiona prompts, agents, skills, context y notas en una ruta global.\nUsa la ruta global para almacenar tus recursos y luego instálalos en \nCopilot (prompts, agents, skills y context) o úsalos desde el chat con \n@fhizx-ai-tools.",
        "view-pane-container-expanded",
        "info",
      ),
      new ConfigurationItem(
        "1️⃣ Actions",
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
        isConfigured ? "Ruta Global Configurada" : "Ruta Global No Configurada",
        isConfigured
          ? `Los recursos se almacenan en: ${globalPath}`
          : "Configura una ruta global para empezar a gestionar tus recursos.",
        isConfigured ? "testing-passed-icon" : "notebook-state-error",
        "info",
      ),
    );

    // 3. Acciones de configuración
    items.push(
      new ConfigurationItem(
        "Seleccionar Ruta Global",
        "Elige la carpeta donde se guardarán prompts, agents, skills, context y notas.",
        "folder-opened",
        "action",
        {
          command: COMMANDS.SET_GLOBAL_PATH,
          title: "Seleccionar Ruta Global",
        },
      ),
    );

    items.push(
      new ConfigurationItem(
        "Recargar",
        "Actualiza todas las vistas (prompts, agents, skills, context, notes y configuración).",
        "refresh",
        "action",
        {
          command: COMMANDS.REFRESH,
          title: "Recargar",
        },
      ),
    );

    return items;
  }
}
