import * as vscode from "vscode";
import * as path from "path";
import { getEncoding } from "js-tiktoken";
import { TokenStatItem } from "../models/tokenStatItemModel";

const encoder = getEncoding("cl100k_base");

export class TokenCounterTreeDataProvider implements vscode.TreeDataProvider<TokenStatItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TokenStatItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    vscode.window.onDidChangeActiveTextEditor(() => this.refresh());
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (
        vscode.window.activeTextEditor &&
        e.document === vscode.window.activeTextEditor.document
      ) {
        this.refresh();
      }
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TokenStatItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<TokenStatItem[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return [
        new TokenStatItem("Sin archivo activo", "Abre un archivo", "info"),
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
    } catch {
      exactTokens = Math.ceil(charCount / 4);
    }

    const costGPT4o = (exactTokens / 1_000_000) * 2.5;
    const costMini = (exactTokens / 1_000_000) * 0.15;
    const costSonnet = (exactTokens / 1_000_000) * 3.0;
    const costGemini = (exactTokens / 1_000_000) * 0.1;

    return [
      new TokenStatItem("📁 Archivo:", fileName, "file"),
      new TokenStatItem(
        "🔢 Tokens Exactos:",
        exactTokens.toLocaleString(),
        "symbol-number",
      ),
      new TokenStatItem(
        "📏 Caracteres:",
        charCount.toLocaleString(),
        "text-size",
      ),
      new TokenStatItem("📖 Palabras:", wordCount.toLocaleString(), "book"),
      new TokenStatItem(
        "📄 Líneas:",
        lineCount.toLocaleString(),
        "list-ordered",
      ),
      new TokenStatItem("--- COSTS BY MODEL ---", "", ""),
      new TokenStatItem(
        "🟢 GPT-4o:",
        `$${costGPT4o.toFixed(5)}`,
        "credit-card",
      ),
      new TokenStatItem(
        "🔵 GPT-4o Mini:",
        `$${costMini.toFixed(5)}`,
        "credit-card",
      ),
      new TokenStatItem(
        "🟠 Claude 3.5 Sonnet:",
        `$${costSonnet.toFixed(5)}`,
        "credit-card",
      ),
      new TokenStatItem(
        "🟣 Gemini Flash:",
        `$${costGemini.toFixed(5)}`,
        "credit-card",
      ),
    ];
  }
}
