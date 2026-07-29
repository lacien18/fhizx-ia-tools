import * as vscode from "vscode";
import { workspaceTreeDataProvider } from "./providers/workspaceTreeDataProvider";
import { TokenCounterTreeDataProvider } from "./providers/tokenCounterProvider";
import { FileManagerService } from "./services/fileManagerService";
import { registerChatParticipant } from "./services/chatParticipantService";
import { registerCommands } from "./suscriptions/commandSubscriptions";

class EmptyTreeDataProvider implements vscode.TreeDataProvider<any> {
  getTreeItem(element: any): vscode.TreeItem { return element; }
  getChildren(): Thenable<any[]> { return Promise.resolve([]); }
}

export function activate(context: vscode.ExtensionContext) {
  // 1. Inicialización de Providers
  const providers = {
    prompts: new workspaceTreeDataProvider("prompts"),
    agents: new workspaceTreeDataProvider("agents"),
    skills: new workspaceTreeDataProvider("skills"),
    notes: new workspaceTreeDataProvider("notes"),
    tokenCounterProvider: new TokenCounterTreeDataProvider(),
  };

  // Registro de DataProviders en la UI de VS Code
  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.info",
    new EmptyTreeDataProvider()
  );
  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.prompts",
    providers.prompts,
  );
  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.agents",
    providers.agents,
  );
  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.skills",
    providers.skills,
  );
  vscode.window.registerTreeDataProvider("fhizxAiTools.notes", providers.notes);
  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.tokenCounter",
    providers.tokenCounterProvider,
  );

  // 2. Servicios de negocio y chat
  const fileManager = new FileManagerService(providers);
  registerChatParticipant(context, fileManager);

  // Función global de refresco
  const refreshAll = () => {
    providers.prompts.refresh();
    providers.agents.refresh();
    providers.skills.refresh();
    providers.notes.refresh();
  };

  // 3. Suscripciones de Comandos
  registerCommands(context, fileManager, refreshAll);

  // 4. Verificación inicial de configuración global
  const config = vscode.workspace.getConfiguration("fhizxAiTools");
  if (!config.get<string>("globalPath")) {
    vscode.window
      .showInformationMessage(
        "Bienvenido a FhizxAITools. Selecciona tu ruta de almacenamiento global.",
        "Seleccionar Ruta",
      )
      .then((selection) => {
        if (selection === "Seleccionar Ruta") {
          vscode.commands.executeCommand("fhizxAiTools.setGlobalPath");
        }
      });
  }

  // 5. Registrar rutas de prompt files en Copilot al activarse
  ensureCopilotPromptConfig();
}

export function deactivate() {}

async function ensureCopilotPromptConfig() {
  try {
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs");

    const copilotBase = path.join(os.homedir(), ".vscode", "github-copilot");
    const categories = ["prompts", "agents", "skills"];
    const config = vscode.workspace.getConfiguration();

    // Register each existing category directory
    const locations = config.get<Record<string, boolean>>("chat.promptFilesLocations") || {};
    let updated = false;

    for (const cat of categories) {
      const catPath = path.join(copilotBase, cat);
      if (fs.existsSync(catPath) && !locations[catPath]) {
        locations[catPath] = true;
        updated = true;
      }
    }

    if (updated) {
      await config.update("chat.promptFilesLocations", locations, vscode.ConfigurationTarget.Global);
    }
  } catch (err) {
    // Silently ignore if prompt file settings are not registered in this VS Code version
    console.warn("FhizxAITools: Could not update prompt files config", err);
  }
}
