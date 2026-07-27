"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceItem = void 0;
const vscode = require("vscode");
class WorkspaceItem extends vscode.TreeItem {
    label;
    resourceUri;
    collapsibleState;
    isFolder;
    constructor(label, resourceUri, collapsibleState, isFolder) {
        super(resourceUri, collapsibleState);
        this.label = label;
        this.resourceUri = resourceUri;
        this.collapsibleState = collapsibleState;
        this.isFolder = isFolder;
        this.contextValue = isFolder ? "folder" : "file";
        if (!isFolder) {
            this.command = {
                command: "fhizxAiTools.openFile",
                title: "Abrir Archivo",
                arguments: [resourceUri],
            };
        }
    }
}
exports.WorkspaceItem = WorkspaceItem;
//# sourceMappingURL=workspaceItemModel.js.map