import * as vscode from "vscode";
import * as path from "path";
import { getEncoding } from "js-tiktoken";
import { TokenStatItem } from "../models/tokenStatItemModel";
import { ENCODING_NAME, MODEL_PRICES } from "../constants";

const encoder = getEncoding(ENCODING_NAME);

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

    const costGPT4o = (exactTokens / 1_000_000) * MODEL_PRICES.GPT_4O;
    const costMini = (exactTokens / 1_000_000) * MODEL_PRICES.GPT_4O_MINI;
    const costSonnet = (exactTokens / 1_000_000) * MODEL_PRICES.CLAUDE_SONNET;
    const costGemini = (exactTokens / 1_000_000) * MODEL_PRICES.GEMINI_FLASH;

    return [
      new TokenStatItem("📁 Archivo:", fileName, ""),
      new TokenStatItem("🔢 Tokens Exactos:", exactTokens.toLocaleString(), ""),
      new TokenStatItem("📏 Caracteres:", charCount.toLocaleString(), ""),
      new TokenStatItem("📖 Palabras:", wordCount.toLocaleString(), ""),
      new TokenStatItem("📄 Líneas:", lineCount.toLocaleString(), ""),
      new TokenStatItem("--- 📉 COSTS BY MODEL 📉  ---", "", ""),
      new TokenStatItem("🟢 GPT-4o:", `$${costGPT4o.toFixed(5)}`, ""),
      new TokenStatItem("🔵 GPT-4o Mini:", `$${costMini.toFixed(5)}`, ""),
      new TokenStatItem(
        "🟠 Claude 3.5 Sonnet:",
        `$${costSonnet.toFixed(5)}`,
        "",
      ),
      new TokenStatItem("🟣 Gemini Flash:", `$${costGemini.toFixed(5)}`, ""),
    ];
  }
}
