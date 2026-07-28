import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { WorkspaceItem } from "../models/workspaceItemModel";

export class InstallationService {
  public static getCopilotGlobalPath(category: string): string {
    return path.join(os.homedir(), ".vscode", "github-copilot", category);
  }

  public static isInstalled(fileName: string, category: string): boolean {
    const targetPath = path.join(this.getCopilotGlobalPath(category), fileName);
    return fs.existsSync(targetPath);
  }

  public static installItem(node: WorkspaceItem, category: string) {
    if (node.isFolder) return;
    const sourcePath = node.resourceUri.fsPath;
    const targetDir = this.getCopilotGlobalPath(category);
    const targetPath = path.join(targetDir, node.label);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
    vscode.window.showInformationMessage(`Instalado en Copilot: ${node.label}`);
  }

  public static uninstallItem(node: WorkspaceItem, category: string) {
    if (node.isFolder) return;
    const targetPath = path.join(this.getCopilotGlobalPath(category), node.label);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      vscode.window.showInformationMessage(`Desinstalado de Copilot: ${node.label}`);
    }
  }
}
