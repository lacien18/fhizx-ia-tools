import * as vscode from "vscode";
import { WorkspaceTreeDataProvider } from "./providers/workspaceTreeDataProvider";
import { FileManagerService } from "./services/fileManagerService";
import { registerChatParticipant } from "./services/chatParticipantService";
import { CloudSyncService } from "./services/cloudSyncService";
import { registerCommands } from "./subscriptions/commandSubscriptions";
import {
  MainWebviewProvider,
  MAIN_WEBVIEW_ID,
} from "./webview/mainWebviewProvider";
import {
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  COMMANDS,
  COPILOT_CATEGORIES,
  COPILOT_BASE_DIR,
} from "./constants";
import {
  ensureGlobalStructure,
  getGlobalPathConfig,
} from "./utils/resourceUtils";

export function activate(context: vscode.ExtensionContext) {
  // Servicio de nube gratuita (GitHub)
  const cloudService = new CloudSyncService(context);

  // 1. Category providers (used by FileManagerService for path resolution)
  const providers = {
    prompts: new WorkspaceTreeDataProvider("prompts"),
    agents: new WorkspaceTreeDataProvider("agents"),
    skills: new WorkspaceTreeDataProvider("skills"),
    context: new WorkspaceTreeDataProvider("context"),
    notes: new WorkspaceTreeDataProvider("notes"),
  };

  // 2. Webview UI (replaces all tree views with a single unified panel)
  const mainWebview = new MainWebviewProvider(
    context.extensionUri,
    cloudService,
  );
  mainWebview.setContext(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MAIN_WEBVIEW_ID, mainWebview),
  );

  // 3. Servicios de negocio y chat
  const fileManager = new FileManagerService(providers, cloudService);
  registerChatParticipant(context, fileManager);

  // Función global de refresco
  const refreshAll = () => {
    mainWebview.refresh();
  };

  // 3. Suscripciones de Comandos
  registerCommands(context, fileManager, refreshAll, cloudService);

  // Comando de listado (usado por el chat participant `listar`)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.LIST, () => {
      const globalPath = getGlobalPathConfig();
      if (!globalPath) {
        vscode.window.showWarningMessage(
          "Configura la ruta global para listar tus recursos.",
        );
        return;
      }
      void vscode.commands.executeCommand(COMMANDS.WORKBENCH_CHAT_OPEN, {
        query: "@fhizx-ai-tools listar",
        isPartialQuery: true,
      });
    }),
  );

  // 4. Verificación inicial de configuración global
  if (!getGlobalPathConfig()) {
    vscode.window
      .showInformationMessage(
        "Bienvenido a FhizxAITools. Selecciona tu ruta de almacenamiento global.",
        "Seleccionar Ruta",
      )
      .then((selection) => {
        if (selection === "Seleccionar Ruta") {
          vscode.commands.executeCommand(COMMANDS.SET_GLOBAL_PATH);
        }
      });
  } else {
    // Asegura la estructura de carpetas si la ruta global ya existía
    const globalPath = getGlobalPathConfig()!;
    if (globalPath) ensureGlobalStructure(globalPath);
  }

  // Auto-sincronización con la nube (sube cambios al guardar)
  let cloudSyncDisposable: vscode.Disposable | undefined;
  const restartCloudSync = async () => {
    cloudSyncDisposable?.dispose();
    cloudSyncDisposable = await cloudService.startAutoSync();
  };
  void restartCloudSync();
  context.subscriptions.push({
    dispose: () => {
      cloudSyncDisposable?.dispose();
      cloudSyncDisposable = undefined;
    },
  });

  // Al cambiar la configuración, recrear la estructura y el watcher de nube
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
      const globalPath = getGlobalPathConfig();
      if (globalPath) ensureGlobalStructure(globalPath);
      void restartCloudSync();
    }
  });

  // 5. Registrar rutas de prompt files en Copilot al activarse
  ensureCopilotPromptConfig();

  // 6. Verificar actualizaciones automáticamente al activarse
  void vscode.commands.executeCommand(COMMANDS.CHECK_FOR_UPDATES);
}

export function deactivate() {}

async function ensureCopilotPromptConfig() {
  try {
    const path = await import("path");
    const fs = await import("fs");

    const copilotBase = COPILOT_BASE_DIR;
    const categories = COPILOT_CATEGORIES;
    const config = vscode.workspace.getConfiguration();

    // Register each existing category directory
    const locations =
      config.get<Record<string, boolean>>(CONFIG_KEYS.PROMPT_FILES_LOCATIONS) ||
      {};
    let updated = false;

    for (const cat of categories) {
      const catPath = path.join(copilotBase, cat);
      if (fs.existsSync(catPath) && !locations[catPath]) {
        locations[catPath] = true;
        updated = true;
      }
    }

    if (updated) {
      await config.update(
        CONFIG_KEYS.PROMPT_FILES_LOCATIONS,
        locations,
        vscode.ConfigurationTarget.Global,
      );
    }
  } catch (err) {
    // Silently ignore if prompt file settings are not registered in this VS Code version
    console.warn("FhizxAITools: Could not update prompt files config", err);
  }
}
