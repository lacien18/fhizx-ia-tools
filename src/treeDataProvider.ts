import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class WorkspaceItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFolder: boolean,
  ) {
    super(resourceUri, collapsibleState);
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

export class WorkspaceTreeDataProvider implements vscode.TreeDataProvider<WorkspaceItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    WorkspaceItem | undefined | void
  > = new vscode.EventEmitter<WorkspaceItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkspaceItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private category: "prompts" | "agents" | "skills" | "notes") {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: WorkspaceItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: WorkspaceItem): Promise<WorkspaceItem[]> {
    const globalPath = this.getGlobalCategoryPath();
    if (!globalPath) {
      return [];
    }

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
            ),
          );
        } else if (entry.isFile()) {
          if (this.validateExtension(entry.name)) {
            items.push(
              new WorkspaceItem(
                entry.name,
                uri,
                vscode.TreeItemCollapsibleState.None,
                false,
              ),
            );
          }
        }
      }

      // Ordenar: Carpetas primero, luego archivos alfabéticamente
      return items.sort((a, b) => {
        if (a.isFolder === b.isFolder) {
          return a.label.localeCompare(b.label);
        }
        return a.isFolder ? -1 : 1;
      });
    } catch (error) {
      return [];
    }
  }

  private validateExtension(fileName: string): boolean {
    if (this.category === "notes") {
      return fileName.endsWith(".md") && !fileName.endsWith(".prompt.md");
    } else {
      return fileName.endsWith(".prompt.md");
    }
  }

  public getGlobalCategoryPath(): string | undefined {
    const config = vscode.workspace.getConfiguration("fhizxAiTools");
    const globalPath = config.get<string>("globalPath");
    if (!globalPath || globalPath.trim() === "") return undefined;
    return path.join(globalPath, this.category);
  }
}
