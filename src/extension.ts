import * as vscode from "vscode";
import { workspaceTreeDataProvider } from "./providers/workspaceTreeDataProvider";
import { TokenCounterTreeDataProvider } from "./providers/tokenCounterProvider";
import { FileManagerService } from "./services/fileManagerService";
import { registerChatParticipant } from "./services/chatParticipantService";
import { registerCommands } from "./suscriptions/commandSubscriptions";

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
}

export function deactivate() {}
