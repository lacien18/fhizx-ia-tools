"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenCounterTreeDataProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const js_tiktoken_1 = require("js-tiktoken");
const tokenStatItemModel_1 = require("../models/tokenStatItemModel");
const encoder = (0, js_tiktoken_1.getEncoding)("cl100k_base");
class TokenCounterTreeDataProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor() {
        vscode.window.onDidChangeActiveTextEditor(() => this.refresh());
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (vscode.window.activeTextEditor &&
                e.document === vscode.window.activeTextEditor.document) {
                this.refresh();
            }
        });
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return [
                new tokenStatItemModel_1.TokenStatItem("Sin archivo activo", "Abre un archivo", "info"),
            ];
        }
        const doc = editor.document;
        const text = doc.getText();
        const fileName = path.basename(doc.fileName);
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const lineCount = doc.lineCount;
        let exactTokens = 0;
        try {
            exactTokens = encoder.encode(text).length;
        }
        catch {
            exactTokens = Math.ceil(charCount / 4);
        }
        const costGPT4o = (exactTokens / 1_000_000) * 2.5;
        const costMini = (exactTokens / 1_000_000) * 0.15;
        const costSonnet = (exactTokens / 1_000_000) * 3.0;
        const costGemini = (exactTokens / 1_000_000) * 0.1;
        return [
            new tokenStatItemModel_1.TokenStatItem("📁 Archivo:", fileName, ""),
            new tokenStatItemModel_1.TokenStatItem("🔢 Tokens Exactos:", exactTokens.toLocaleString(), ""),
            new tokenStatItemModel_1.TokenStatItem("📏 Caracteres:", charCount.toLocaleString(), ""),
            new tokenStatItemModel_1.TokenStatItem("📖 Palabras:", wordCount.toLocaleString(), ""),
            new tokenStatItemModel_1.TokenStatItem("📄 Líneas:", lineCount.toLocaleString(), ""),
            new tokenStatItemModel_1.TokenStatItem("--- 📉 COSTS BY MODEL 📉  ---", "", ""),
            new tokenStatItemModel_1.TokenStatItem("🟢 GPT-4o:", `$${costGPT4o.toFixed(5)}`, ""),
            new tokenStatItemModel_1.TokenStatItem("🔵 GPT-4o Mini:", `$${costMini.toFixed(5)}`, ""),
            new tokenStatItemModel_1.TokenStatItem("🟠 Claude 3.5 Sonnet:", `$${costSonnet.toFixed(5)}`, ""),
            new tokenStatItemModel_1.TokenStatItem("🟣 Gemini Flash:", `$${costGemini.toFixed(5)}`, ""),
        ];
    }
}
exports.TokenCounterTreeDataProvider = TokenCounterTreeDataProvider;
//# sourceMappingURL=tokenCounterProvider.js.map