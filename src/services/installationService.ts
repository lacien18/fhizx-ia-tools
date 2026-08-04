import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { CONFIG_KEYS, COPILOT_BASE_DIR } from "../constants";
import { isDirectory, toPromptFileName } from "../utils/fsUtils";

export class InstallationService {
  public static getCopilotGlobalPath(category: string): string {
    return path.join(COPILOT_BASE_DIR, category);
  }

  public static isInstalled(fileName: string, category: string): boolean {
    const targetFileName = toPromptFileName(fileName);
    const targetPath = path.join(
      this.getCopilotGlobalPath(category),
      targetFileName,
    );
    return fs.existsSync(targetPath);
  }

  public static async installItem(node: WorkspaceItem, category: string) {
    if (isDirectory(node.resourceUri.fsPath)) return;
    const sourcePath = node.resourceUri.fsPath;
    const targetDir = this.getCopilotGlobalPath(category);

    const targetFileName = toPromptFileName(node.label);
    const targetPath = path.join(targetDir, targetFileName);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
    await this.updateCopilotConfig(targetDir);
    vscode.window.showInformationMessage(
      `Instalado en Copilot: ${targetFileName}`,
    );
  }

  public static async uninstallItem(node: WorkspaceItem, category: string) {
    if (isDirectory(node.resourceUri.fsPath)) return;
    const targetDir = this.getCopilotGlobalPath(category);
    const targetFileName = toPromptFileName(node.label);
    const targetPath = path.join(targetDir, targetFileName);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      vscode.window.showInformationMessage(
        `Desinstalado de Copilot: ${targetFileName}`,
      );
    }
  }

  public static async toggleItem(node: WorkspaceItem, category: string) {
    if (isDirectory(node.resourceUri.fsPath)) return;
    if (this.isInstalled(node.label, category)) {
      await this.uninstallItem(node, category);
    } else {
      await this.installItem(node, category);
    }
  }

  private static async updateCopilotConfig(targetDir: string) {
    try {
      const config = vscode.workspace.getConfiguration();

      // Update locations for prompt files
      const locations =
        config.get<Record<string, boolean>>(
          CONFIG_KEYS.PROMPT_FILES_LOCATIONS,
        ) || {};

      if (!locations[targetDir]) {
        const updatedLocations = { ...locations, [targetDir]: true };
        await config.update(
          CONFIG_KEYS.PROMPT_FILES_LOCATIONS,
          updatedLocations,
          vscode.ConfigurationTarget.Global,
        );
      }
    } catch (err) {
      // Silently ignore if the setting is not registered in this VS Code version
      console.warn("FhizxAITools: Could not update prompt files config", err);
    }
  }
}
