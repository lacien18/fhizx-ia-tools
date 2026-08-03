import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { InstallationService } from "../services/installationService";
import { CONFIG_NAMESPACE, CONFIG_KEYS } from "../constants";

export class workspaceTreeDataProvider implements vscode.TreeDataProvider<WorkspaceItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    WorkspaceItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    public category: "prompts" | "agents" | "skills" | "context" | "notes",
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: WorkspaceItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: WorkspaceItem): Promise<WorkspaceItem[]> {
    const globalPath = this.getGlobalCategoryPath();
    if (!globalPath) return [];

    const targetPath = element ? element.resourceUri.fsPath : globalPath;

    try {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      const items: WorkspaceItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);
        const uri = vscode.Uri.file(fullPath);

        if (entry.isDirectory()) {
          items.push(
            new WorkspaceItem(
              entry.name,
              uri,
              vscode.TreeItemCollapsibleState.Collapsed,
              true,
              this.category,
              false,
            ),
          );
        } else if (entry.isFile() && this.validateExtension(entry.name)) {
          const isInstalled = InstallationService.isInstalled(
            entry.name,
            this.category,
          );
          items.push(
            new WorkspaceItem(
              entry.name,
              uri,
              vscode.TreeItemCollapsibleState.None,
              false,
              this.category,
              isInstalled,
            ),
          );
        }
      }

      return items.sort((a, b) => {
        if (a.isFolder === b.isFolder) return a.label.localeCompare(b.label);
        return a.isFolder ? -1 : 1;
      });
    } catch (error) {
      return [];
    }
  }

  private validateExtension(fileName: string): boolean {
    if (this.category === "notes") {
      return fileName.endsWith(".md") && !fileName.endsWith(".prompt.md");
    }
    return fileName.endsWith(".prompt.md");
  }

  public getGlobalCategoryPath(): string | undefined {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const globalPath = config.get<string>(CONFIG_KEYS.GLOBAL_PATH);
    if (!globalPath || globalPath.trim() === "") return undefined;
    return path.join(globalPath, this.category);
  }
}
