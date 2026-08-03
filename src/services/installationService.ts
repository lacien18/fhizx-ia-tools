import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { CONFIG_KEYS, FILE_EXTENSIONS, COPILOT_BASE_DIR } from "../constants";

export class InstallationService {
  public static getCopilotGlobalPath(category: string): string {
    return path.join(COPILOT_BASE_DIR, category);
  }

  private static getTargetFileName(fileName: string): string {
    if (fileName.endsWith(FILE_EXTENSIONS.PROMPT_MD)) return fileName;
    let baseName = fileName;
    if (baseName.endsWith(".instructions.md")) {
      baseName = baseName.slice(0, -".instructions.md".length);
    } else if (baseName.endsWith(FILE_EXTENSIONS.MARKDOWN)) {
      baseName = baseName.slice(0, -FILE_EXTENSIONS.MARKDOWN.length);
    }
    return `${baseName}${FILE_EXTENSIONS.PROMPT_MD}`;
  }

  public static isInstalled(fileName: string, category: string): boolean {
    const targetFileName = this.getTargetFileName(fileName);
    const targetPath = path.join(
      this.getCopilotGlobalPath(category),
      targetFileName,
    );
    return fs.existsSync(targetPath);
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
    vscode.window.showInformationMessage(
      `Instalado en Copilot: ${targetFileName}`,
    );
  }

  public static async uninstallItem(node: WorkspaceItem, category: string) {
    if (node.isFolder) return;
    const targetDir = this.getCopilotGlobalPath(category);
    const targetFileName = this.getTargetFileName(node.label);
    const targetPath = path.join(targetDir, targetFileName);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      vscode.window.showInformationMessage(
        `Desinstalado de Copilot: ${targetFileName}`,
      );
    }
  }
}
