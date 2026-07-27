"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceTreeDataProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const workspaceItemModel_1 = require("../models/workspaceItemModel");
class workspaceTreeDataProvider {
    category;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(category) {
        this.category = category;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        const globalPath = this.getGlobalCategoryPath();
        if (!globalPath)
            return [];
        const targetPath = element ? element.resourceUri.fsPath : globalPath;
        try {
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }
            const entries = fs.readdirSync(targetPath, { withFileTypes: true });
            const items = [];
            for (const entry of entries) {
                const fullPath = path.join(targetPath, entry.name);
                const uri = vscode.Uri.file(fullPath);
                if (entry.isDirectory()) {
                    items.push(new workspaceItemModel_1.WorkspaceItem(entry.name, uri, vscode.TreeItemCollapsibleState.Collapsed, true));
                }
                else if (entry.isFile() && this.validateExtension(entry.name)) {
                    items.push(new workspaceItemModel_1.WorkspaceItem(entry.name, uri, vscode.TreeItemCollapsibleState.None, false));
                }
            }
            return items.sort((a, b) => {
                if (a.isFolder === b.isFolder)
                    return a.label.localeCompare(b.label);
                return a.isFolder ? -1 : 1;
            });
        }
        catch (error) {
            return [];
        }
    }
    validateExtension(fileName) {
        if (this.category === "notes") {
            return fileName.endsWith(".md") && !fileName.endsWith(".prompt.md");
        }
        return fileName.endsWith(".prompt.md");
    }
    getGlobalCategoryPath() {
        const config = vscode.workspace.getConfiguration("fhizxAiTools");
        const globalPath = config.get("globalPath");
        if (!globalPath || globalPath.trim() === "")
            return undefined;
        return path.join(globalPath, this.category);
    }
}
exports.workspaceTreeDataProvider = workspaceTreeDataProvider;
//# sourceMappingURL=workspaceTreeDataProvider.js.map