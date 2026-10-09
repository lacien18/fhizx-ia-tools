import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { WorkspaceTreeDataProvider } from "../providers/workspaceTreeDataProvider";
import {
  FILE_PREFIXES,
  CATEGORY_FILE_EXTENSIONS,
  CATEGORIES,
  type CategoryType,
} from "../constants";
import {
  isDirectory,
  safeReadFile,
  stripCategoryFileExtension,
} from "../utils/fsUtils";
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
          stripCategoryFileExtension(entry.name) === name)
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
      case "instructions":
        return `# Instruction: ${rawName}\n\n## Aplicación\n[Describe cuándo debe aplicarse esta instrucción]\n\n## Reglas\n- Regla 1\n`;
      case "context":
        return `# Context: ${rawName}\n\n## Propósito\n[Describe qué contexto aporta este archivo]\n\n## Información Relevante\n- Dato 1\n`;
      case "notes":
        return `# Nota: ${rawName}\n\n## Resumen\n[Notas rápidas]\n\n---\n\n`;
      default:
        return `# ${rawName}\n`;
    }
  }

  async createVoiceNote(
    transcript: string,
    refreshAll: () => void,
  ): Promise<void> {
    try {
      const content = transcript.trim();
      if (!content) {
        vscode.window.showWarningMessage("No se detectó contenido en el dictado.");
        return;
      }

      const basePath = this.providers.notes.getGlobalCategoryPath() || "";
      if (!basePath) {
        vscode.window.showWarningMessage(
          "Configura la ruta global haciendo clic en el icono de configuración.",
        );
        return;
      }

      fs.mkdirSync(basePath, { recursive: true });
      const baseName = this.getVoiceNoteBaseName(content);
      const filePath = this.getUniqueVoiceNotePath(basePath, baseName);
      const noteContent = `# Nota por voz\n\n${content}\n`;

      fs.writeFileSync(filePath, noteContent, "utf-8");
      refreshAll();
      this.cloudService?.scheduleExplicitPush();
      void vscode.window.showTextDocument(vscode.Uri.file(filePath));
    } catch (error) {
      notifyFsError("No se pudo crear la nota por voz", error);
    }
  }

  private getVoiceNoteBaseName(content: string): string {
    const slug = content
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "");

    return slug ? `nota-${slug}` : `nota-${Date.now()}`;
  }

  private getUniqueVoiceNotePath(basePath: string, baseName: string): string {
    let filePath = path.join(basePath, `${baseName}.md`);
    let suffix = 2;

    while (fs.existsSync(filePath)) {
      filePath = path.join(basePath, `${baseName}-${suffix}.md`);
      suffix += 1;
    }

    return filePath;
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

      const extension = CATEGORY_FILE_EXTENSIONS[category];
      const cleanName = stripCategoryFileExtension(name.trim());

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
