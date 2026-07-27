"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const treeDataProvider_1 = require("./treeDataProvider");
function activate(context) {
    const promptsProvider = new treeDataProvider_1.WorkspaceTreeDataProvider("prompts");
    const agentsProvider = new treeDataProvider_1.WorkspaceTreeDataProvider("agents");
    const skillsProvider = new treeDataProvider_1.WorkspaceTreeDataProvider("skills");
    const notesProvider = new treeDataProvider_1.WorkspaceTreeDataProvider("notes");
    const providers = {
        prompts: promptsProvider,
        agents: agentsProvider,
        skills: skillsProvider,
        notes: notesProvider,
    };
    vscode.window.registerTreeDataProvider("fhizxAiTools.prompts", promptsProvider);
    vscode.window.registerTreeDataProvider("fhizxAiTools.agents", agentsProvider);
    vscode.window.registerTreeDataProvider("fhizxAiTools.skills", skillsProvider);
    vscode.window.registerTreeDataProvider("fhizxAiTools.notes", notesProvider);
    // Función genérica aislada para crear archivos en su sección correcta
    async function createNewFile(category, targetNode) {
        let basePath = "";
        if (targetNode) {
            const stat = fs.statSync(targetNode.resourceUri.fsPath);
            basePath = stat.isDirectory()
                ? targetNode.resourceUri.fsPath
                : path.dirname(targetNode.resourceUri.fsPath);
            category = getCategoryFromPath(basePath, providers);
        }
        else {
            basePath = providers[category].getGlobalCategoryPath() || "";
        }
        if (!basePath) {
            vscode.window.showWarningMessage("Por favor configura la ruta global haciendo clic en el icono de configuración de la barra.");
            return;
        }
        const name = await vscode.window.showInputBox({
            prompt: `Nombre del archivo para ${category}`,
        });
        if (!name)
            return;
        const isNote = category === "notes";
        const extension = isNote ? ".md" : ".prompt.md";
        const finalName = name.endsWith(extension) || (isNote && name.endsWith(".prompt.md"))
            ? name
            : isNote
                ? `${name}.md`
                : `${name}.prompt.md`;
        const filePath = path.join(basePath, finalName);
        if (fs.existsSync(filePath)) {
            vscode.window.showErrorMessage("El archivo ya existe.");
            return;
        }
        fs.writeFileSync(filePath, `# ${name}\n`);
        refreshAll();
        vscode.window.showTextDocument(vscode.Uri.file(filePath));
    }
    // Función genérica aislada para crear carpetas en su sección correcta
    async function createNewFolder(category, targetNode) {
        let basePath = "";
        if (targetNode) {
            const stat = fs.statSync(targetNode.resourceUri.fsPath);
            basePath = stat.isDirectory()
                ? targetNode.resourceUri.fsPath
                : path.dirname(targetNode.resourceUri.fsPath);
            category = getCategoryFromPath(basePath, providers);
        }
        else {
            basePath = providers[category].getGlobalCategoryPath() || "";
        }
        if (!basePath) {
            vscode.window.showWarningMessage("Por favor configura la ruta global.");
            return;
        }
        const name = await vscode.window.showInputBox({
            prompt: "Nombre de la nueva carpeta",
        });
        if (!name)
            return;
        const folderPath = path.join(basePath, name);
        if (fs.existsSync(folderPath)) {
            vscode.window.showErrorMessage("La carpeta ya existe.");
            return;
        }
        fs.mkdirSync(folderPath, { recursive: true });
        refreshAll();
    }
    context.subscriptions.push(vscode.commands.registerCommand("fhizxAiTools.setGlobalPath", async () => {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: "Seleccionar carpeta raíz global para FhizxAITools",
        });
        if (uri && uri[0]) {
            const selectedPath = uri[0].fsPath;
            await vscode.workspace
                .getConfiguration("fhizxAiTools")
                .update("globalPath", selectedPath, vscode.ConfigurationTarget.Global);
            const categories = [
                "prompts",
                "agents",
                "skills",
                "notes",
            ];
            for (const cat of categories) {
                const subPath = path.join(selectedPath, cat);
                if (!fs.existsSync(subPath)) {
                    fs.mkdirSync(subPath, { recursive: true });
                }
            }
            vscode.window.showInformationMessage(`Ruta global configurada en: ${selectedPath}`);
            refreshAll();
        }
    }), vscode.commands.registerCommand("fhizxAiTools.openFile", (uri) => {
        vscode.window.showTextDocument(uri);
    }), 
    // Comandos específicos de Prompts
    vscode.commands.registerCommand("fhizxAiTools.createPromptFile", () => createNewFile("prompts")), vscode.commands.registerCommand("fhizxAiTools.createPromptFolder", () => createNewFolder("prompts")), 
    // Comandos específicos de Agents
    vscode.commands.registerCommand("fhizxAiTools.createAgentFile", () => createNewFile("agents")), vscode.commands.registerCommand("fhizxAiTools.createAgentFolder", () => createNewFolder("agents")), 
    // Comandos específicos de Skills
    vscode.commands.registerCommand("fhizxAiTools.createSkillFile", () => createNewFile("skills")), vscode.commands.registerCommand("fhizxAiTools.createSkillFolder", () => createNewFolder("skills")), 
    // Comandos específicos de Notes
    vscode.commands.registerCommand("fhizxAiTools.createNoteFile", () => createNewFile("notes")), vscode.commands.registerCommand("fhizxAiTools.createNoteFolder", () => createNewFolder("notes")), 
    // Comandos para menú contextual (clic derecho en carpetas existentes)
    vscode.commands.registerCommand("fhizxAiTools.createFileContext", (node) => createNewFile("prompts", node)), vscode.commands.registerCommand("fhizxAiTools.createFolderContext", (node) => createNewFolder("prompts", node)), vscode.commands.registerCommand("fhizxAiTools.renameItem", async (node) => {
        if (!node)
            return;
        const oldPath = node.resourceUri.fsPath;
        const parsedPath = path.parse(oldPath);
        const newName = await vscode.window.showInputBox({
            prompt: "Modificar nombre",
            value: parsedPath.name,
        });
        if (!newName)
            return;
        const finalNewName = newName.endsWith(parsedPath.ext)
            ? newName
            : `${newName}${parsedPath.ext}`;
        const newPath = path.join(parsedPath.dir, finalNewName);
        if (fs.existsSync(newPath)) {
            vscode.window.showErrorMessage("Ya existe un elemento con ese nombre.");
            return;
        }
        fs.renameSync(oldPath, newPath);
        refreshAll();
        vscode.window.showInformationMessage("Elemento modificado exitosamente.");
    }), vscode.commands.registerCommand("fhizxAiTools.deleteItem", async (node) => {
        if (!node)
            return;
        const confirm = await vscode.window.showWarningMessage(`¿Deseas eliminar "${node.label}"?`, { modal: true }, "Eliminar");
        if (confirm === "Eliminar") {
            if (node.isFolder) {
                fs.rmSync(node.resourceUri.fsPath, {
                    recursive: true,
                    force: true,
                });
            }
            else {
                fs.unlinkSync(node.resourceUri.fsPath);
            }
            refreshAll();
            vscode.window.showInformationMessage("Elemento eliminado.");
        }
    }), vscode.commands.registerCommand("fhizxAiTools.checkForUpdates", () => {
        vscode.window.showInformationMessage("FhizxAITools se encuentra actualizado.");
    }));
    // Integración del chat IA (@fhizx-ai-tools)
    const chatParticipant = vscode.chat.createChatParticipant("fhizx-ai-tools.participant", async (request, context, response, token) => {
        const promptQuery = request.prompt.trim();
        const globalPath = vscode.workspace
            .getConfiguration("fhizxAiTools")
            .get("globalPath");
        if (!globalPath) {
            response.markdown("Configura la ruta global de la extensión primero.");
            return;
        }
        const match = promptQuery.match(/usar\s+(.+)/i);
        if (match) {
            const promptName = match[1].trim();
            // Buscar primero en prompts, luego en agents y skills por si se invocan desde el chat
            let promptFilePath = findFileRecursive(path.join(globalPath, "prompts"), promptName);
            if (!promptFilePath)
                promptFilePath = findFileRecursive(path.join(globalPath, "agents"), promptName);
            if (!promptFilePath)
                promptFilePath = findFileRecursive(path.join(globalPath, "skills"), promptName);
            if (promptFilePath && fs.existsSync(promptFilePath)) {
                const content = fs.readFileSync(promptFilePath, "utf-8");
                response.markdown(`### Recurso cargado: \`${promptName}\`\n\n${content}`);
                return;
            }
            else {
                response.markdown(`No se encontró el recurso \`${promptName}\` en tu espacio de trabajo global.`);
                return;
            }
        }
        response.markdown("Usa `@fhizx-ai-tools usar <nombre>` para invocar tus prompts, agents o skills.");
    });
    chatParticipant.iconPath = vscode.Uri.file(path.join(context.extensionPath, "media", "icon.svg"));
    context.subscriptions.push(chatParticipant);
    function refreshAll() {
        promptsProvider.refresh();
        agentsProvider.refresh();
        skillsProvider.refresh();
        notesProvider.refresh();
    }
    function getCategoryFromPath(targetPath, provs) {
        for (const key of ["prompts", "agents", "skills", "notes"]) {
            const catPath = provs[key].getGlobalCategoryPath();
            if (catPath && targetPath.startsWith(catPath)) {
                return key;
            }
        }
        return "prompts";
    }
    function findFileRecursive(dir, name) {
        if (!fs.existsSync(dir))
            return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = findFileRecursive(fullPath, name);
                if (found)
                    return found;
            }
            else if (entry.isFile() &&
                (entry.name === name ||
                    entry.name.replace(/\.prompt\.md$/, "") === name)) {
                return fullPath;
            }
        }
        return null;
    }
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