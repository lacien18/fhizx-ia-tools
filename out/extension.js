"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const workspaceTreeDataProvider_1 = require("./providers/workspaceTreeDataProvider");
const tokenCounterProvider_1 = require("./providers/tokenCounterProvider");
const fileManagerService_1 = require("./services/fileManagerService");
const chatParticipantService_1 = require("./services/chatParticipantService");
const commandSubscriptions_1 = require("./suscriptions/commandSubscriptions");
function activate(context) {
    // 1. Inicialización de Providers
    const providers = {
        prompts: new workspaceTreeDataProvider_1.workspaceTreeDataProvider("prompts"),
        agents: new workspaceTreeDataProvider_1.workspaceTreeDataProvider("agents"),
        skills: new workspaceTreeDataProvider_1.workspaceTreeDataProvider("skills"),
        notes: new workspaceTreeDataProvider_1.workspaceTreeDataProvider("notes"),
        tokenCounterProvider: new tokenCounterProvider_1.TokenCounterTreeDataProvider(),
    };
    // Registro de DataProviders en la UI de VS Code
    vscode.window.registerTreeDataProvider("fhizxAiTools.prompts", providers.prompts);
    vscode.window.registerTreeDataProvider("fhizxAiTools.agents", providers.agents);
    vscode.window.registerTreeDataProvider("fhizxAiTools.skills", providers.skills);
    vscode.window.registerTreeDataProvider("fhizxAiTools.notes", providers.notes);
    vscode.window.registerTreeDataProvider("fhizxAiTools.tokenCounter", providers.tokenCounterProvider);
    // 2. Servicios de negocio y chat
    const fileManager = new fileManagerService_1.FileManagerService(providers);
    (0, chatParticipantService_1.registerChatParticipant)(context, fileManager);
    // Función global de refresco
    const refreshAll = () => {
        providers.prompts.refresh();
        providers.agents.refresh();
        providers.skills.refresh();
        providers.notes.refresh();
    };
    // 3. Suscripciones de Comandos
    (0, commandSubscriptions_1.registerCommands)(context, fileManager, refreshAll);
    // 4. Verificación inicial de configuración global
    const config = vscode.workspace.getConfiguration("fhizxAiTools");
    if (!config.get("globalPath")) {
        vscode.window
            .showInformationMessage("Bienvenido a FhizxAITools. Selecciona tu ruta de almacenamiento global.", "Seleccionar Ruta")
            .then((selection) => {
            if (selection === "Seleccionar Ruta") {
                vscode.commands.executeCommand("fhizxAiTools.setGlobalPath");
            }
        });
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map