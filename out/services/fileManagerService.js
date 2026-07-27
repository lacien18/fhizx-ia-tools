"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManagerService = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class FileManagerService {
    providers;
    constructor(providers) {
        this.providers = providers;
    }
    getCategoryFromPath(targetPath) {
        for (const key of ["prompts", "agents", "skills", "notes"]) {
            const catPath = this.providers[key].getGlobalCategoryPath();
            if (catPath && targetPath.startsWith(catPath))
                return key;
        }
        return "prompts";
    }
    findFileRecursive(dir, name) {
        if (!fs.existsSync(dir))
            return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = this.findFileRecursive(fullPath, name);
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
    getBoilerplateContent(category, rawName) {
        switch (category) {
            case "prompts":
                return `# Prompt: ${rawName}\n\n## Descripción\n[Describe brevemente el propósito]\n\n## Variables\n- \`{{variable}}\`: Descripción\n\n## Contenido\n[Escribe aquí]\n`;
            case "agents":
                return `# Agent: ${rawName}\n\n## Rol y Propósito\n[Define quién es este agente]\n\n## Instrucciones\n- Regla 1\n`;
            case "skills":
                return `# Skill: ${rawName}\n\n## Objetivo\n[Describe la habilidad]\n\n## Pasos\n1. Paso inicial...\n`;
            case "notes":
                return `# Nota: ${rawName}\n\n## Resumen\n[Notas rápidas]\n\n---\n\n`;
            default:
                return `# ${rawName}\n`;
        }
    }
    async createNewFile(category, refreshAll, targetNode) {
        let basePath = "";
        if (targetNode) {
            const stat = fs.statSync(targetNode.resourceUri.fsPath);
            basePath = stat.isDirectory()
                ? targetNode.resourceUri.fsPath
                : path.dirname(targetNode.resourceUri.fsPath);
            category = this.getCategoryFromPath(basePath);
        }
        else {
            basePath = this.providers[category].getGlobalCategoryPath() || "";
        }
        if (!basePath) {
            vscode.window.showWarningMessage("Configura la ruta global haciendo clic en el icono de configuración.");
            return;
        }
        const name = await vscode.window.showInputBox({
            prompt: `Nombre del archivo para ${category}`,
            placeHolder: "ej. mi-archivo",
        });
        if (!name)
            return;
        const isNote = category === "notes";
        const extension = isNote ? ".md" : ".prompt.md";
        const prefixes = {
            prompts: "p-",
            agents: "a-",
            skills: "s-",
            notes: "",
        };
        const prefix = prefixes[category];
        let cleanName = name.trim();
        if (cleanName.endsWith(extension))
            cleanName = cleanName.slice(0, -extension.length);
        if (prefix && !cleanName.startsWith(prefix))
            cleanName = prefix + cleanName;
        const filePath = path.join(basePath, `${cleanName}${extension}`);
        if (fs.existsSync(filePath)) {
            vscode.window.showErrorMessage("El archivo ya existe.");
            return;
        }
        fs.writeFileSync(filePath, this.getBoilerplateContent(category, name));
        refreshAll();
        vscode.window.showTextDocument(vscode.Uri.file(filePath));
    }
    async createNewFolder(category, refreshAll, targetNode) {
        let basePath = "";
        if (targetNode) {
            const stat = fs.statSync(targetNode.resourceUri.fsPath);
            basePath = stat.isDirectory()
                ? targetNode.resourceUri.fsPath
                : path.dirname(targetNode.resourceUri.fsPath);
            category = this.getCategoryFromPath(basePath);
        }
        else {
            basePath = this.providers[category].getGlobalCategoryPath() || "";
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
}
exports.FileManagerService = FileManagerService;
//# sourceMappingURL=fileManagerService.js.map