import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { getEncoding } from "js-tiktoken";
import { getStyles } from "./styles";
import { getScript } from "./script";
import {
  buildFileTree,
  renderCategoryPanel,
  renderConfigPanel,
  renderTokenPanel,
} from "./htmlGenerators";
import {
  CATEGORIES,
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  COMMANDS,
  COPILOT_CATEGORIES,
  MODEL_PRICES,
  TOKENS_PER_MILLION,
  ENCODING_NAME,
  type CategoryType,
} from "../constants";
import { InstallationService } from "../services/installationService";
import { CloudSyncService } from "../services/cloudSyncService";
import { getGlobalPathConfig } from "../utils/resourceUtils";

const encoder = getEncoding(ENCODING_NAME);

export const MAIN_WEBVIEW_ID = "fhizxAiTools.mainView";

const SECTION_ORDER_KEY = "fhizxAiTools.sectionOrder";
const DEFAULT_SECTION_ORDER = [
  "utils",
  "notes",
  "agents",
  "skills",
  "prompts",
  "context",
] as const;

export class MainWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _disposables: vscode.Disposable[] = [];
  private _context!: vscode.ExtensionContext;
  private _selectedTokenFile?: string;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly cloudService: CloudSyncService,
  ) {}

  setContext(context: vscode.ExtensionContext): void {
    this._context = context;
  }

  private _getSectionOrder(): string[] {
    const saved = this._context?.globalState.get<string[]>(SECTION_ORDER_KEY);
    return saved && saved.length > 0 ? saved : [...DEFAULT_SECTION_ORDER];
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this._getFullHtml();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      (msg) => this._handleMessage(msg),
      undefined,
      this._disposables,
    );

    // Refresh on config change
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration(CONFIG_NAMESPACE)) {
          this.refresh();
        }
      },
      undefined,
      this._disposables,
    );

    // Token counter: refresh on editor/document change
    vscode.window.onDidChangeActiveTextEditor(
      () => this._updateTokenPanel(),
      undefined,
      this._disposables,
    );
    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (
          vscode.window.activeTextEditor &&
          e.document === vscode.window.activeTextEditor.document
        ) {
          this._updateTokenPanel();
        }
      },
      undefined,
      this._disposables,
    );

    webviewView.onDidDispose(() => {
      this._disposables.forEach((d) => d.dispose());
      this._disposables = [];
    });
  }

  /**
   * Full refresh: re-render all panels.
   */
  refresh(): void {
    if (!this._view) return;

    const panels: Record<string, string> = {};
    const globalPath = getGlobalPathConfig();

    for (const cat of CATEGORIES) {
      const catPath = globalPath ? path.join(globalPath, cat) : "";
      const items = catPath ? buildFileTree(catPath, cat) : [];
      panels[cat] = renderCategoryPanel(items, cat);
    }

    panels["config"] = this._buildConfigHtml();
    panels["tokens"] = this._buildTokenHtml();

    void this._view.webview.postMessage({
      type: "updateAll",
      panels,
    });
  }

  private _updateTokenPanel(): void {
    if (!this._view) return;
    void this._view.webview.postMessage({
      type: "update",
      panel: "tokens",
      html: this._buildTokenHtml(),
    });
  }

  private _buildConfigHtml(): string {
    const globalPath = getGlobalPathConfig() || "";
    const isConfigured = !!globalPath;
    // Cloud info (sync call wrappers)
    let isCloudConnected = false;
    let cloudRepo = "";
    let autoSync = false;

    try {
      // These are sync-safe for rendering
      const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
      const owner = config.get<string>(CONFIG_KEYS.CLOUD_OWNER) || "";
      const repo = config.get<string>(CONFIG_KEYS.CLOUD_REPO) || "";
      autoSync = config.get<boolean>(CONFIG_KEYS.CLOUD_AUTO_SYNC) ?? true;
      isCloudConnected = !!owner && !!repo;
      cloudRepo = isCloudConnected ? `${owner}/${repo}` : "";
    } catch {
      // ignore
    }

    return renderConfigPanel({
      globalPath,
      isConfigured,
      isCloudConnected,
      cloudRepo,
      autoSync,
    });
  }

  private _buildTokenHtml(): string {
    let filePath: string | undefined;
    let text = "";
    let fileName = "";

    if (this._selectedTokenFile && fs.existsSync(this._selectedTokenFile)) {
      filePath = this._selectedTokenFile;
      text = fs.readFileSync(filePath, "utf-8");
      fileName = path.basename(filePath);
    } else {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return renderTokenPanel(null, this._getGlobalFiles());
      text = editor.document.getText();
      fileName = path.basename(editor.document.fileName);
    }

    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text.split("\n").length;

    let exactTokens = 0;
    try {
      exactTokens = encoder.encode(text).length;
    } catch {
      exactTokens = Math.ceil(charCount / 4);
    }

    const costs = [
      {
        model: "GPT-4o",
        cost: `$${((exactTokens / TOKENS_PER_MILLION) * MODEL_PRICES.GPT_4O).toFixed(5)}`,
      },
      {
        model: "GPT-4o Mini",
        cost: `$${((exactTokens / TOKENS_PER_MILLION) * MODEL_PRICES.GPT_4O_MINI).toFixed(5)}`,
      },
      {
        model: "Claude 3.5 Sonnet",
        cost: `$${((exactTokens / TOKENS_PER_MILLION) * MODEL_PRICES.CLAUDE_SONNET).toFixed(5)}`,
      },
      {
        model: "Gemini Flash",
        cost: `$${((exactTokens / TOKENS_PER_MILLION) * MODEL_PRICES.GEMINI_FLASH).toFixed(5)}`,
      },
    ];

    return renderTokenPanel(
      {
        fileName,
        tokens: exactTokens,
        characters: charCount,
        words: wordCount,
        lines: lineCount,
        costs,
      },
      this._getGlobalFiles(),
    );
  }

  private _getGlobalFiles(): { name: string; path: string }[] {
    const globalPath = getGlobalPathConfig();
    if (!globalPath) return [];
    const files: { name: string; path: string }[] = [];
    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith(".md")) {
            files.push({ name: path.relative(globalPath, full), path: full });
          }
        }
      } catch {
        /* ignore */
      }
    };
    walk(globalPath);
    return files;
  }

  private _getFullHtml(): string {
    const globalPath = getGlobalPathConfig();

    // Build initial panels
    const categoryPanels = CATEGORIES.map((cat) => {
      const catPath = globalPath ? path.join(globalPath, cat) : "";
      const items = catPath ? buildFileTree(catPath, cat) : [];
      const content = renderCategoryPanel(items, cat);

      const categoryLabel = cat.charAt(0).toUpperCase() + cat.slice(1);

      return { id: cat, label: categoryLabel, content };
    });

    const configContent = this._buildConfigHtml();
    const tokenContent = this._buildTokenHtml();

    // Build a lookup of all section HTML keyed by id
    const sectionMap: Record<string, string> = {};
    for (const p of categoryPanels) {
      const headerActions = this._getCategoryHeaderActions(
        p.id as CategoryType,
      );
      sectionMap[p.id] = `
        <div class="accordion-section open" data-section="${p.id}" draggable="true">
          <div class="accordion-header">
            <span class="accordion-chevron">▶</span>
            <span class="accordion-title">${p.label}</span>
            <div class="accordion-actions">${headerActions}</div>
          </div>
          <div class="accordion-body">
            <div class="accordion-content" id="panel-${p.id}">${p.content}</div>
          </div>
        </div>`;
    }

    const tabsHtml = `
      <div class="bottom-tabs">
        <div class="tab-bar">
          <button class="tab active" data-tab="tokens">Tokens</button>
          <button class="tab" data-tab="config">Config</button>
        </div>
        <div class="tab-panel active" id="tab-tokens">${tokenContent}</div>
        <div class="tab-panel" id="tab-config">${configContent}</div>
      </div>`;

    sectionMap["utils"] = `
      <div class="accordion-section open" data-section="utils" draggable="true">
        <div class="accordion-header">
          <span class="accordion-chevron">▶</span>
          <span class="accordion-title">Utils</span>
        </div>
        <div class="accordion-body">
          <div class="accordion-content">${tabsHtml}</div>
        </div>
      </div>`;

    const order = this._getSectionOrder().filter(
      (id) => id !== "tokens" && id !== "config",
    );
    const sections = order
      .filter((id) => sectionMap[id])
      .map((id) => sectionMap[id])
      .join("");

    return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>${getStyles()}</style>
</head>
<body>
  ${sections}
  <div id="context-menu" class="context-menu"></div>
  <script>${getScript()}</script>
</body>
</html>`;
  }

  private _getCategoryHeaderActions(category: CategoryType): string {
    const cap = category.charAt(0).toUpperCase() + category.slice(1);
    return `
      <button class="icon-btn" data-action="createFile" data-category="${category}" title="Crear archivo">📄</button>
      <button class="icon-btn" data-action="createFolder" data-category="${category}" title="Crear carpeta">📁</button>
    `;
  }

  private async _handleMessage(msg: {
    type: string;
    path?: string;
    category?: string;
  }): Promise<void> {
    switch (msg.type) {
      case "openFile":
        if (msg.path) {
          void vscode.commands.executeCommand(
            COMMANDS.OPEN_FILE,
            vscode.Uri.file(msg.path),
          );
        }
        break;

      case "preview":
        if (msg.path) {
          void vscode.commands.executeCommand(
            COMMANDS.PREVIEW_MARKDOWN,
            vscode.Uri.file(msg.path),
          );
        }
        break;

      case "sendToChat":
        if (msg.path) {
          void vscode.commands.executeCommand(
            COMMANDS.SEND_TO_CHAT,
            vscode.Uri.file(msg.path),
          );
        }
        break;

      case "copyToClipboard":
        if (msg.path) {
          void vscode.commands.executeCommand(
            COMMANDS.COPY_TO_CLIPBOARD,
            vscode.Uri.file(msg.path),
          );
        }
        break;

      case "exportToPdf":
        if (msg.path) {
          void vscode.commands.executeCommand(
            COMMANDS.EXPORT_TO_PDF,
            vscode.Uri.file(msg.path),
          );
        }
        break;

      case "createFile":
        if (msg.category) {
          const catFile = msg.category.endsWith("s")
            ? msg.category.slice(0, -1)
            : msg.category;
          void vscode.commands.executeCommand(
            `fhizxAiTools.create${catFile.charAt(0).toUpperCase() + catFile.slice(1)}File`,
          );
        }
        break;

      case "createFolder":
        if (msg.category) {
          const catFolder = msg.category.endsWith("s")
            ? msg.category.slice(0, -1)
            : msg.category;
          void vscode.commands.executeCommand(
            `fhizxAiTools.create${catFolder.charAt(0).toUpperCase() + catFolder.slice(1)}Folder`,
          );
        }
        break;

      case "createFileContext":
        if (msg.path) {
          // We need to pass a WorkspaceItem-like object. Use the command with URI.
          void vscode.commands.executeCommand(COMMANDS.CREATE_FILE_CONTEXT, {
            resourceUri: vscode.Uri.file(msg.path),
            isFolder: true,
            category: msg.category,
            label: path.basename(msg.path),
          });
        }
        break;

      case "createFolderContext":
        if (msg.path) {
          void vscode.commands.executeCommand(COMMANDS.CREATE_FOLDER_CONTEXT, {
            resourceUri: vscode.Uri.file(msg.path),
            isFolder: true,
            category: msg.category,
            label: path.basename(msg.path),
          });
        }
        break;

      case "renameItem":
        if (msg.path) {
          void vscode.commands.executeCommand(COMMANDS.RENAME_ITEM, {
            resourceUri: vscode.Uri.file(msg.path),
            isFolder: false,
            category: msg.category || "",
            label: path.basename(msg.path),
          });
        }
        break;

      case "deleteItem":
        if (msg.path) {
          const isDir = (() => {
            try {
              return require("fs").statSync(msg.path).isDirectory();
            } catch {
              return false;
            }
          })();
          void vscode.commands.executeCommand(COMMANDS.DELETE_ITEM, {
            resourceUri: vscode.Uri.file(msg.path),
            isFolder: isDir,
            category: msg.category || "",
            label: path.basename(msg.path),
          });
        }
        break;

      case "installItem":
        if (msg.path && msg.category) {
          void vscode.commands.executeCommand(COMMANDS.INSTALL_ITEM, {
            resourceUri: vscode.Uri.file(msg.path),
            isFolder: false,
            category: msg.category,
            label: path.basename(msg.path),
          });
        }
        break;

      case "uninstallItem":
        if (msg.path && msg.category) {
          void vscode.commands.executeCommand(COMMANDS.UNINSTALL_ITEM, {
            resourceUri: vscode.Uri.file(msg.path),
            isFolder: false,
            category: msg.category,
            label: path.basename(msg.path),
          });
        }
        break;

      // Config actions → delegate to existing commands
      case "setGlobalPath":
        void vscode.commands.executeCommand(COMMANDS.SET_GLOBAL_PATH);
        break;
      case "openGlobalPath":
        void vscode.commands.executeCommand(COMMANDS.OPEN_GLOBAL_PATH);
        break;
      case "refresh":
        void vscode.commands.executeCommand(COMMANDS.REFRESH);
        break;
      case "toggleInstall":
        void vscode.commands.executeCommand(COMMANDS.TOGGLE_INSTALL);
        break;
      case "checkForUpdates":
        void vscode.commands.executeCommand(COMMANDS.CHECK_FOR_UPDATES);
        break;
      case "cloudConnect":
        void vscode.commands.executeCommand(COMMANDS.CLOUD_CONNECT);
        break;
      case "cloudPush":
        void vscode.commands.executeCommand(COMMANDS.CLOUD_PUSH);
        break;
      case "cloudPull":
        void vscode.commands.executeCommand(COMMANDS.CLOUD_PULL);
        break;
      case "cloudDisconnect":
        void vscode.commands.executeCommand(COMMANDS.CLOUD_DISCONNECT);
        break;
      case "cloudToggleAutoSync":
        void vscode.commands.executeCommand(COMMANDS.CLOUD_TOGGLE_AUTO_SYNC);
        break;

      case "saveSectionOrder":
        if (Array.isArray((msg as any).order)) {
          void this._context?.globalState.update(
            SECTION_ORDER_KEY,
            (msg as any).order,
          );
        }
        break;

      case "selectFileForTokens":
        if (msg.path) {
          this._selectedTokenFile = msg.path;
          this._updateTokenPanel();
        }
        break;

      case "clearTokenFile":
        this._selectedTokenFile = undefined;
        this._updateTokenPanel();
        break;
    }
  }

  dispose(): void {
    this._disposables.forEach((d) => d.dispose());
  }
}
