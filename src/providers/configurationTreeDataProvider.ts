import * as vscode from "vscode";
import { ConfigurationItem } from "../models/configurationItemModel";
import { COMMANDS, CONFIG_NAMESPACE, CONFIG_KEYS, ICONS } from "../constants";
import { CloudSyncService } from "../services/cloudSyncService";

export class ConfigurationTreeDataProvider implements vscode.TreeDataProvider<ConfigurationItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ConfigurationItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private cloudService: CloudSyncService) {
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
        "🗂️ ALMACENAMIENTO LOCAL",
        "",
        "view-pane-container-expanded",
        "info",
      ),
      new ConfigurationItem(
        "🗃️ Seleccionar ruta local",
        "- Elige la carpeta donde se guardarán prompts, agents, skills, context y notas.",
        "",
        "info",
        {
          command: COMMANDS.SET_GLOBAL_PATH,
          title: "Seleccionar Ruta Global",
        },
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

    // 3. Sección de nube gratuita (GitHub)
    const isCloudConnected = await this.cloudService.isConfigured();
    const cloudRepo = await this.cloudService.getDisplayRepo();
    const autoSync = this.cloudService.getAutoSyncEnabled();

    items.push(
      new ConfigurationItem(
        "☁️ ALMACENAMIENTO NUBE (GITHUB)",
        "",
        "view-pane-container-expanded",
        "info",
      ),
    );

    if (!isCloudConnected) {
      items.push(
        new ConfigurationItem(
          "🔗 Conectar Nube",
          "- Guarda tus archivos en un repositorio privado y gratuito de GitHub.",
          "",
          "info",
          {
            command: COMMANDS.CLOUD_CONNECT,
            title: "Conectar a Nube (GitHub)",
          },
        ),
      );
    } else {
      items.push(
        new ConfigurationItem(
          "🔌 Desconectar Nube",
          "- Deja de sincronizar con GitHub (no borra archivos locales).",
          "",
          "info",
          {
            command: COMMANDS.CLOUD_DISCONNECT,
            title: "Desconectar Nube",
          },
        ),
      );
    }

    items.push(
      new ConfigurationItem(
        "📤 Subir archivos",
        "- Sube los cambios locales a GitHub.",
        "",
        "info",
        {
          command: COMMANDS.CLOUD_PUSH,
          title: "Subir a la Nube",
        },
      ),
      new ConfigurationItem(
        "📥 Bajar archivos",
        "- Descarga los archivos de GitHub a tu ruta local.",
        "",
        "info",
        {
          command: COMMANDS.CLOUD_PULL,
          title: "Bajar desde la Nube",
        },
      ),
      new ConfigurationItem(
        "",
        isCloudConnected
          ? `Conectado a ${cloudRepo} · auto-sync ${
              autoSync ? "activado (pregunta al guardar)" : "desactivado"
            }`
          : "No conectado. Usa 'Conectar Nube' para guardar tus archivos gratis en GitHub.",
        isCloudConnected ? ICONS.PASSED : ICONS.ERROR,
        "status",
      ),
    );

    return items;
  }
}
