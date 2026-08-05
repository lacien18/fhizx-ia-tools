import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { WorkspaceTreeDataProvider } from "../providers/workspaceTreeDataProvider";
import {
  FILE_PREFIXES,
  FILE_EXTENSIONS,
  CATEGORIES,
  type CategoryType,
} from "../constants";
import { isDirectory, safeReadFile, toPromptFileName } from "../utils/fsUtils";
import { getGlobalPathConfig, notifyFsError } from "../utils/resourceUtils";
import { CloudSyncService } from "./cloudSyncService";

/**
 * Providers de categoría expuestos al FileManagerService.
 * Contrato mínimo para resolver la ruta de cada categoría.
 */
export interface CategoryProvider {
  getGlobalCategoryPath(): string | undefined;
}

export type FileManagerProviders = Record<CategoryType, CategoryProvider>;

export class FileManagerService {
  constructor(
    private providers: FileManagerProviders,
    private cloudService?: CloudSyncService,
  ) {}

  getCategoryFromPath(targetPath: string): CategoryType | undefined {
    for (const key of CATEGORIES) {
      const catPath = this.providers[key].getGlobalCategoryPath();
      if (catPath && targetPath.startsWith(catPath)) return key;
    }
    return undefined;
  }

  findFileRecursive(dir: string, name: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = this.findFileRecursive(fullPath, name);
        if (found) return found;
      } else if (
        entry.isFile() &&
        (entry.name === name ||
          (entry.name.endsWith(FILE_EXTENSIONS.PROMPT_MD) &&
            entry.name.slice(0, -FILE_EXTENSIONS.PROMPT_MD.length) === name))
      ) {
        return fullPath;
      }
    }
    return null;
  }

  getBoilerplateContent(category: CategoryType, rawName: string): string {
    switch (category) {
      case "prompts":
        return `# Prompt: ${rawName}\n\n## Descripción\n[Describe brevemente el propósito]\n\n## Variables\n- \`{{variable}}\`: Descripción\n\n## Contenido\n[Escribe aquí]\n`;
      case "agents":
        return `# Agent: ${rawName}\n\n## Rol y Propósito\n[Define quién es este agente]\n\n## Instrucciones\n- Regla 1\n`;
      case "skills":
        return `# Skill: ${rawName}\n\n## Objetivo\n[Describe la habilidad]\n\n## Pasos\n1. Paso inicial...\n`;
      case "context":
        return `# Context: ${rawName}\n\n## Propósito\n[Describe qué contexto aporta este archivo]\n\n## Información Relevante\n- Dato 1\n`;
      case "notes":
        return `# Nota: ${rawName}\n\n## Resumen\n[Notas rápidas]\n\n---\n\n`;
      default:
        return `# ${rawName}\n`;
    }
  }

  async createNewFile(
    category: CategoryType,
    refreshAll: () => void,
    targetNode?: WorkspaceItem,
  ) {
    try {
      let basePath = "";
      if (targetNode) {
        basePath = isDirectory(targetNode.resourceUri.fsPath)
          ? targetNode.resourceUri.fsPath
          : path.dirname(targetNode.resourceUri.fsPath);
        category = this.getCategoryFromPath(basePath) ?? category;
      } else {
        basePath = this.providers[category].getGlobalCategoryPath() || "";
      }

      if (!basePath) {
        vscode.window.showWarningMessage(
          "Configura la ruta global haciendo clic en el icono de configuración.",
        );
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: `Nombre del archivo para ${category}`,
        placeHolder: "ej. mi-archivo",
      });
      if (!name) return;

      const isNote = category === "notes";
      const extension = isNote
        ? FILE_EXTENSIONS.MARKDOWN
        : FILE_EXTENSIONS.PROMPT_MD;

      let cleanName = name.trim();
      if (cleanName.endsWith(extension))
        cleanName = cleanName.slice(0, -extension.length);

      const prefixForfile = FILE_PREFIXES[category] || "";

      const filePath = path.join(
        basePath,
        `${prefixForfile}${cleanName}${extension}`,
      );
      if (fs.existsSync(filePath)) {
        vscode.window.showErrorMessage("El archivo ya existe.");
        return;
      }

      fs.writeFileSync(filePath, this.getBoilerplateContent(category, name));
      refreshAll();
      this.cloudService?.scheduleExplicitPush();
      vscode.window.showTextDocument(vscode.Uri.file(filePath));
    } catch (error) {
      notifyFsError("No se pudo crear el archivo", error);
    }
  }

  async createNewFolder(
    category: CategoryType,
    refreshAll: () => void,
    targetNode?: WorkspaceItem,
  ) {
    try {
      let basePath = "";
      if (targetNode) {
        basePath = isDirectory(targetNode.resourceUri.fsPath)
          ? targetNode.resourceUri.fsPath
          : path.dirname(targetNode.resourceUri.fsPath);
        category = this.getCategoryFromPath(basePath) ?? category;
      } else {
        basePath = this.providers[category].getGlobalCategoryPath() || "";
      }

      if (!basePath) {
        vscode.window.showWarningMessage("Por favor configura la ruta global.");
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: "Nombre de la nueva carpeta",
      });
      if (!name) return;

      const folderPath = path.join(basePath, name);
      if (fs.existsSync(folderPath)) {
        vscode.window.showErrorMessage("La carpeta ya existe.");
        return;
      }

      fs.mkdirSync(folderPath, { recursive: true });
      refreshAll();
      this.cloudService?.scheduleExplicitPush();
    } catch (error) {
      notifyFsError("No se pudo crear la carpeta", error);
    }
  }
}
