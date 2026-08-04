import * as vscode from "vscode";
import { WorkspaceTreeDataProvider } from "./providers/workspaceTreeDataProvider";
import { TokenCounterTreeDataProvider } from "./providers/tokenCounterProvider";
import { ConfigurationTreeDataProvider } from "./providers/configurationTreeDataProvider";
import { FileManagerService } from "./services/fileManagerService";
import { registerChatParticipant } from "./services/chatParticipantService";
import { registerCommands } from "./subscriptions/commandSubscriptions";
import {
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  COMMANDS,
  COPILOT_CATEGORIES,
  COPILOT_BASE_DIR,
  VIEW_IDS,
} from "./constants";
import {
  ensureGlobalStructure,
  getGlobalPathConfig,
} from "./utils/resourceUtils";

export function activate(context: vscode.ExtensionContext) {
  // 1. Inicialización de Providers
  const providers = {
    prompts: new WorkspaceTreeDataProvider("prompts"),
    agents: new WorkspaceTreeDataProvider("agents"),
    skills: new WorkspaceTreeDataProvider("skills"),
    context: new WorkspaceTreeDataProvider("context"),
    notes: new WorkspaceTreeDataProvider("notes"),
    tokenCounterProvider: new TokenCounterTreeDataProvider(),
    configurations: new ConfigurationTreeDataProvider(),
  };

  // Registro de DataProviders en la UI de VS Code
  vscode.window.registerTreeDataProvider(VIEW_IDS.PROMPTS, providers.prompts);
  vscode.window.registerTreeDataProvider(VIEW_IDS.AGENTS, providers.agents);
  vscode.window.registerTreeDataProvider(VIEW_IDS.SKILLS, providers.skills);
  vscode.window.registerTreeDataProvider(VIEW_IDS.CONTEXT, providers.context);
  vscode.window.registerTreeDataProvider(VIEW_IDS.NOTES, providers.notes);
  vscode.window.registerTreeDataProvider(
    VIEW_IDS.TOKEN_COUNTER,
    providers.tokenCounterProvider,
  );
  vscode.window.registerTreeDataProvider(
    VIEW_IDS.CONFIGURATIONS,
    providers.configurations,
  );

  // 2. Servicios de negocio y chat
  const fileManager = new FileManagerService(providers);
  registerChatParticipant(context, fileManager);

  // Función global de refresco
  const refreshAll = () => {
    providers.prompts.refresh();
    providers.agents.refresh();
    providers.skills.refresh();
    providers.context.refresh();
    providers.notes.refresh();
    providers.configurations.refresh();
  };

  // 3. Suscripciones de Comandos
  registerCommands(context, fileManager, refreshAll);

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

  // Al cambiar la ruta global, recrear la estructura de carpetas
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
      const globalPath = getGlobalPathConfig();
      if (globalPath) ensureGlobalStructure(globalPath);
    }
  });

  // 5. Registrar rutas de prompt files en Copilot al activarse
  ensureCopilotPromptConfig();
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
