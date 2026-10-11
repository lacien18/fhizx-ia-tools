import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { CONFIG_KEYS, type CategoryType } from "../constants";
import { isDirectory } from "../utils/fsUtils";
import {
  getCopilotGlobalPath as resolveCopilotGlobalPath,
  getCopilotTargetPath,
} from "../utils/copilotUtils";

export class InstallationService {
  private static userProfileDirectory = "";

  public static initialize(globalStorageUri: vscode.Uri): void {
    this.userProfileDirectory = path.resolve(
      globalStorageUri.fsPath,
      "..",
      "..",
    );
  }

  public static getCopilotGlobalPath(category: string): string {
    return resolveCopilotGlobalPath(
      category as CategoryType,
      this.userProfileDirectory,
    );
  }

  public static isInstalled(fileName: string, category: string): boolean {
    const targetPath = getCopilotTargetPath(
      fileName,
      category as CategoryType,
      this.userProfileDirectory,
    );
    return fs.existsSync(targetPath);
  }

  public static async installItem(node: WorkspaceItem, category: string) {
    if (isDirectory(node.resourceUri.fsPath)) return;
    const sourcePath = node.resourceUri.fsPath;
    const targetPath = getCopilotTargetPath(
      node.label,
      category as CategoryType,
      this.userProfileDirectory,
    );
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, targetPath);
    if (category === "prompts" || category === "context") {
      await this.updateCopilotConfig(targetDir);
    }
    vscode.window.showInformationMessage(
      `Instalado en Copilot: ${path.basename(targetPath)}`,
    );
  }

  public static async uninstallItem(node: WorkspaceItem, category: string) {
    if (isDirectory(node.resourceUri.fsPath)) return;
    const targetPath = getCopilotTargetPath(
      node.label,
      category as CategoryType,
      this.userProfileDirectory,
    );

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      if (category === "skills") {
        const skillDirectory = path.dirname(targetPath);
        if (fs.readdirSync(skillDirectory).length === 0) {
          fs.rmdirSync(skillDirectory);
        }
      }
      vscode.window.showInformationMessage(
        `Desinstalado de Copilot: ${path.basename(targetPath)}`,
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
