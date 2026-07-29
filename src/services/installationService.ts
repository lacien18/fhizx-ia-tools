import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { WorkspaceItem } from "../models/workspaceItemModel";

export class InstallationService {
  public static getCopilotGlobalPath(category: string): string {
    return path.join(os.homedir(), ".vscode", "github-copilot", category);
  }

  private static getTargetFileName(fileName: string): string {
    if (fileName.endsWith(".prompt.md")) return fileName;
    return fileName.replace(/\.instructions\.md$|\.md$/, "") + ".prompt.md";
  }

  public static isInstalled(fileName: string, category: string): boolean {
    const targetFileName = this.getTargetFileName(fileName);
    const targetPath = path.join(this.getCopilotGlobalPath(category), targetFileName);
    return fs.existsSync(targetPath);
  }

  private static async updateCopilotConfig(targetDir: string) {
    try {
      const config = vscode.workspace.getConfiguration();

      // Update locations for prompt files
      const locations = config.get<Record<string, boolean>>("chat.promptFilesLocations") || {};
      
      if (!locations[targetDir]) {
        const updatedLocations = { ...locations, [targetDir]: true };
        await config.update("chat.promptFilesLocations", updatedLocations, vscode.ConfigurationTarget.Global);
      }
    } catch (err) {
      // Silently ignore if the setting is not registered in this VS Code version
      console.warn("FhizxAITools: Could not update prompt files config", err);
    }
  }

  public static async installItem(node: WorkspaceItem, category: string) {
    if (node.isFolder) return;
    const sourcePath = node.resourceUri.fsPath;
    const targetDir = this.getCopilotGlobalPath(category);
    
    const targetFileName = this.getTargetFileName(node.label);
    const targetPath = path.join(targetDir, targetFileName);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
    await this.updateCopilotConfig(targetDir);
    vscode.window.showInformationMessage(`Instalado en Copilot: ${targetFileName}`);
  }

  public static async uninstallItem(node: WorkspaceItem, category: string) {
    if (node.isFolder) return;
    const targetDir = this.getCopilotGlobalPath(category);
    const targetFileName = this.getTargetFileName(node.label);
    const targetPath = path.join(targetDir, targetFileName);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      vscode.window.showInformationMessage(`Desinstalado de Copilot: ${targetFileName}`);
    }
  }
}
