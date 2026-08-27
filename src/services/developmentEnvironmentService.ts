import * as vscode from "vscode";

export const DEVELOPMENT_EXTENSION_IDS = [
  "github.copilot-chat",
  "streetsidesoftware.code-spell-checker",
  "bierner.emojisense",
  "nash.awesome-flutter-snippets",
  "aaron-bond.better-comments",
  "ms-vscode.vscode-chat-customizations-evaluations",
  "naumovs.color-highlight",
  "vivaxy.vscode-conventional-commits",
  "dart-code.dart-code",
  "usernamehw.errorlens",
  "dbaeumer.vscode-eslint",
  "dart-code.flutter",
  "djbkwon.flutter-dependency-docs",
  "mhutchie.git-graph",
  "kisstkondoros.vscode-gutter-preview",
  "oderwat.indent-rainbow",
  "narasimapandiyan.jetbrainsmono",
  "mathiasfrohlich.kotlin",
  "danlambiase.lmstudio-copilot-provider",
  "pkief.material-icon-theme",
  "christian-kohler.path-intellisense",
  "esbenp.prettier-vscode",
  "ms-ceintl.vscode-language-pack-es",
  "tinaciousdesign.theme-tinaciousdesign",
  "pflannery.vscode-versionlens",
  "knowbee.vscode-flutter-auto-insert-comma",
  "redhat.vscode-xml",
] as const;

const DEVELOPMENT_STYLE_SETTINGS: Readonly<Record<string, unknown>> = {
  "editor.fontFamily": "JetBrains Mono",
  "terminal.integrated.fontFamily": "monospace",
  "editor.formatOnSave": true,
  "breadcrumbs.enabled": false,
  "editor.fontLigatures": true,
  "workbench.sideBar.location": "right",
  "workbench.colorCustomizations": {
    "editorIndentGuide.activeBackground1": "#069bf1",
    "editorIndentGuide.background1": "#b0daf2e7",
    "sideBarSectionHeader.background": "#90D2F9",
    "sideBarSectionHeader.foreground": "#000000b7",
    "sideBarTitle.foreground": "#069bf1",
    "sideBar.background": "#F7F7FE",
    "activityBar.background": "#F7F7FE",
    "activityBar.foreground": "#069bf1",
    "statusBar.background": "#069bf1",
    "statusBar.debuggingBackground": "#d1bd04",
    "titleBar.activeBackground": "#90D2F9",
    "titleBar.inactiveBackground": "#d2ebf9",
    "editorGroupHeader.tabsBackground": "#F7F7FE",
    "tab.activeBackground": "#F7F7FE",
    "tab.inactiveBackground": "#F7F7FE",
    "tab.activeForeground": "#069bf1",
    "tab.inactiveForeground": "#9fd2f0",
    "tab.border": "#e5e5f5",
    "terminal.foreground": "#069bf1",
    "terminal.border": "#069bf1",
    "terminalCursor.foreground": "#fd00fd",
    "terminal.selectionBackground": "#e5e5f5",
    "terminal.tab.activeBorder": "#fd00fd",
    "scrollbarSlider.background": "#90D2F9",
  },
  "workbench.editor.showTabs": "single",
  "workbench.secondarySideBar.defaultVisibility": "visible",
  "workbench.colorTheme": "Tinacious Design (Light)  (legacy, 2017)",
  "workbench.editor.empty.hint": "hidden",
  "workbench.iconTheme": "material-icon-theme",
  "editor.stickyScroll.enabled": false,
  "editor.codeLens": true,
  "diffEditor.codeLens": true,
  "editor.defaultFormatter": "Dart-Code.flutter",
  "editor.formatOnType": true,
  "editor.formatOnPaste": true,
  "editor.tokenColorCustomizations": {
    textMateRules: [
      {
        scope: "keyword.control",
        settings: {
          foreground: "#fd00fd",
          fontStyle: "italic",
        },
      },
    ],
  },
  "js/ts.updateImportsOnFileMove.enabled": "always",
  "emojisense.languages": {
    md: true,
    dart: true,
    typescript: true,
    javascript: true,
    flutter: true,
    markdown: true,
    plaintext: {
      markupCompletionsEnabled: false,
      emojiDecoratorsEnabled: false,
    },
    "git-commit": true,
  },
  "git.autofetch": true,
  // "[dart].editor.formatOnSave": true,
  // "[dart].editor.formatOnType": true,
  // "[dart].editor.rulers": [80],
  // "[dart].editor.selectionHighlight": false,
  // "[dart].editor.suggestSelection": "first",
  // "[dart].editor.tabCompletion": "onlySnippets",
  // "[dart].editor.wordBasedSuggestions": "off",
  // "[dart].editor.defaultFormatter": "Dart-Code.dart-code",
  "git.suggestSmartCommit": false,
  "flutter-auto-insert-comma.enableAutoInsertComma": true,
  "flutter-auto-insert-comma.activationFiles": ["dart"],

  "notebook.defaultFormatter": "Dart-Code.flutter",
  "dart.flutterSdkPath":
    "/Users/richaralfonsocorreadelacruz/fvm/versions/3.29.3",
 // "[yaml].editor.defaultFormatter": "esbenp.prettier-vscode",
  "security.workspace.trust.untrustedFiles": "open",
  "diffEditor.ignoreTrimWhitespace": false,
  "github.copilot.enable": {
    "*": false,
    plaintext: false,
    markdown: true,
    scminput: false,
  },
  "github.copilot.nextEditSuggestions.enabled": true,
  "dart.debugExternalPackageLibraries": true,
  "dart.debugSdkLibraries": false,

  "dart.devToolsLocation": {
    default: "beside",
    inspector: "sidebar",
  },
  "terminal.integrated.initialHint": false,

  "chat.tools.urls.autoApprove": {
    "https://code.visualstudio.com": true,
    "https://github.com/microsoft/vscode/wiki/*": true,
    "https://raw.githubusercontent.com/oxipng/oxipng/master/README.md": true,
    "https://raw.githubusercontent.com/oxipng/oxipng/master": true,
    "https://raw.githubusercontent.com/oxipng/oxipng": true,
    "https://raw.githubusercontent.com/oxipng": true,
    "https://raw.githubusercontent.com": true,
    "https://*.githubusercontent.com": true,
  },
  "http.systemCertificatesNode": true,
  "git.confirmSync": false,
  "chat.tools.terminal.autoApprove": {
    cd: true,
    echo: true,
    ls: true,
    dir: true,
    pwd: true,
    cat: true,
    head: true,
    tail: true,
    findstr: true,
    wc: true,
    tr: true,
    cut: true,
    cmp: true,
    which: true,
    basename: true,
    dirname: true,
    realpath: true,
    readlink: true,
    stat: true,
    file: true,
    od: true,
    du: true,
    df: true,
    sleep: true,
    nl: true,
    grep: true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+status\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+log\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+log\\b.*\\s--output(=|\\s|$)/": false,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+show\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+diff\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+ls-files\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+grep\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+branch\\b/": true,
    "/^git(\\s+(-C\\s+\\S+|--no-pager))*\\s+branch\\b.*\\s-(d|D|m|M|-delete|-force)\\b/": false,
    "/^docker\\s+(ps|images|info|version|inspect|logs|top|stats|port|diff|search|events)\\b/": true,
    "/^docker\\s+(container|image|network|volume|context|system)\\s+(ls|ps|inspect|history|show|df|info)\\b/": true,
    "/^docker\\s+compose\\s+(ps|ls|top|logs|images|config|version|port|events)\\b/": true,
    "Get-ChildItem": true,
    "Get-Content": true,
    "Get-Date": true,
    "Get-Random": true,
    "Get-Location": true,
    "Set-Location": true,
    "Write-Host": true,
    "Write-Output": true,
    "Out-String": true,
    "Split-Path": true,
    "Join-Path": true,
    "Start-Sleep": true,
    "Where-Object": true,
    "/^Select-[a-z0-9]/i": true,
    "/^Measure-[a-z0-9]/i": true,
    "/^Compare-[a-z0-9]/i": true,
    "/^Format-[a-z0-9]/i": true,
    "/^Sort-[a-z0-9]/i": true,
    "/^npm\\s+(ls|list|outdated|view|info|show|explain|why|root|prefix|bin|search|doctor|fund|repo|bugs|docs|home|help(-search)?)\\b/": true,
    "/^npm\\s+config\\s+(list|get)\\b/": true,
    "/^npm\\s+pkg\\s+get\\b/": true,
    "/^npm\\s+audit$/": true,
    "/^npm\\s+cache\\s+verify\\b/": true,
    "/^yarn\\s+(list|outdated|info|why|bin|help|versions)\\b/": true,
    "/^yarn\\s+licenses\\b/": true,
    "/^yarn\\s+audit\\b(?!.*\\bfix\\b)/": true,
    "/^yarn\\s+config\\s+(list|get)\\b/": true,
    "/^yarn\\s+cache\\s+dir\\b/": true,
    "/^pnpm\\s+(ls|list|outdated|why|root|bin|doctor)\\b/": true,
    "/^pnpm\\s+licenses\\b/": true,
    "/^pnpm\\s+audit\\b(?!.*\\bfix\\b)/": true,
    "/^pnpm\\s+config\\s+(list|get)\\b/": true,
    "npm ci": true,
    "/^yarn\\s+install\\s+--frozen-lockfile\\b/": true,
    "/^pnpm\\s+install\\s+--frozen-lockfile\\b/": true,
    column: true,
    "/^column\\b.*\\s-c\\s+[0-9]{4,}/": false,
    date: true,
    "/^date\\b.*\\s(-s|--set)\\b/": false,
    find: true,
    "/^find\\b.*\\s-(delete|exec|execdir|fprint|fprintf|fls|ok|okdir)\\b/": false,
    rg: true,
    "/^rg\\b.*\\s(--pre|--hostname-bin)\\b/": false,
    sed: true,
    "/^sed\\b.*\\s(-[a-zA-Z]*(e|f)[a-zA-Z]*|--expression|--file)\\b/": false,
    "/^sed\\b.*s\\/.*\\/.*\\/[ew]/": false,
    "/^sed\\b.*;W/": false,
    sort: true,
    "/^sort\\b.*\\s-(o|S)\\b/": false,
    tree: true,
    "/^tree\\b.*\\s-o\\b/": false,
    "/^xxd$/": true,
    "/^xxd\\b(\\s+-\\S+)*\\s+[^-\\s]\\S*$/": true,
    rm: true,
    rmdir: true,
    del: false,
    "Remove-Item": false,
    ri: false,
    rd: false,
    erase: false,
    dd: false,
    kill: false,
    ps: false,
    top: false,
    "Stop-Process": false,
    spps: false,
    taskkill: false,
    "taskkill.exe": false,
    curl: false,
    wget: false,
    "Invoke-RestMethod": false,
    "Invoke-WebRequest": false,
    irm: false,
    iwr: false,
    chmod: false,
    chown: false,
    "Set-ItemProperty": false,
    sp: false,
    "Set-Acl": false,
    jq: false,
    xargs: false,
    eval: true,
    "Invoke-Expression": false,
    iex: false,
  },
  "chat.byokUtilityModelDefault": "mainAgent",
  "chat.utilityModel": "",
  "chat.utilitySmallModel": "",
  "chat.viewSessions.orientation": "stacked",
  "fhizxAiTools.cloud.owner": "lacien18",
  "fhizxAiTools.cloud.repo": "fhizx-ai-tools-backup",
  "fhizxAiTools.cloud.autoSync": true,
};

interface DevExtensionQuickPickItem extends vscode.QuickPickItem {
  id: string;
}

export class DevelopmentEnvironmentService {
  static async installExtensions(
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
  ): Promise<{
    installed: number;
    skipped: number;
    omitted: number;
    cancelled: boolean;
  }> {
    const selectedIds = await this.pickExtensionsToInstall();
    if (selectedIds === undefined) {
      return { installed: 0, skipped: 0, omitted: 0, cancelled: true };
    }

    let installed = 0;
    let skipped = 0;
    const omitted = DEVELOPMENT_EXTENSION_IDS.length - selectedIds.length;
    const increment = 100 / (selectedIds.length || 1);

    for (const extensionId of selectedIds) {
      progress?.report({ message: `Instalando ${extensionId}…`, increment });

      if (vscode.extensions.getExtension(extensionId)) {
        skipped++;
        continue;
      }

      await vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        extensionId,
      );
      installed++;
    }

    return { installed, skipped, omitted, cancelled: false };
  }

  // Muestra un QuickPick multi-selección (checkboxes) con botón "Instalar todo" en el título
  private static async pickExtensionsToInstall(): Promise<
    string[] | undefined
  > {
    return new Promise((resolve) => {
      const quickPick =
        vscode.window.createQuickPick<DevExtensionQuickPickItem>();
      quickPick.title = "Instalar extensiones de desarrollo";
      quickPick.placeholder = "Selecciona las extensiones a instalar";
      quickPick.canSelectMany = true;
      quickPick.matchOnDescription = true;

      const items: DevExtensionQuickPickItem[] = DEVELOPMENT_EXTENSION_IDS.map(
        (id) => {
          const alreadyInstalled = !!vscode.extensions.getExtension(id);
          return {
            id,
            label: id,
            description: alreadyInstalled ? "Ya instalada" : undefined,
          };
        },
      );

      quickPick.items = items;
      quickPick.selectedItems = items.filter(
        (item) => item.description !== "Ya instalada",
      );

      const installAllButton: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon("check-all"),
        tooltip: "Instalar todo",
      };
      quickPick.buttons = [installAllButton];

      quickPick.onDidTriggerButton((button) => {
        if (button === installAllButton) {
          quickPick.selectedItems = quickPick.items;
        }
      });

      let accepted = false;
      quickPick.onDidAccept(() => {
        accepted = true;
        resolve(quickPick.selectedItems.map((item) => item.id));
        quickPick.hide();
      });

      quickPick.onDidHide(() => {
        if (!accepted) {
          resolve(undefined);
        }
        quickPick.dispose();
      });

      quickPick.show();
    });
  }

  static async applyStyle(): Promise<number> {
    const configuration = vscode.workspace.getConfiguration();
    let applied = 0;

    for (const [key, value] of Object.entries(DEVELOPMENT_STYLE_SETTINGS)) {
      await configuration.update(key, value, vscode.ConfigurationTarget.Global);
      applied++;
    }

    return applied;
  }
}
