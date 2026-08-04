import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { WorkspaceItem } from "../models/workspaceItemModel";
import { CATEGORIES, CONFIG_NAMESPACE, CONFIG_KEYS } from "../constants";

/**
 * Utilidades que dependen de la API de VS Code (configuración, editor activo,
 * notificaciones). Centralizan la lógica repetida entre comandos y servicios.
 */

export function getGlobalPathConfig(): string | undefined {
  const globalPath = vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE)
    .get<string>(CONFIG_KEYS.GLOBAL_PATH);
  return globalPath && globalPath.trim() !== "" ? globalPath : undefined;
}

/** Crea (si faltan) las subcarpetas de categoría dentro de la ruta global. */
export function ensureGlobalStructure(globalPath: string): void {
  for (const cat of CATEGORIES) {
    const subPath = path.join(globalPath, cat);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  }
}

export function resolveResourceFilePath(
  node?: WorkspaceItem | vscode.Uri,
): string {
  if (node instanceof vscode.Uri) return node.fsPath;
  if (node && "resourceUri" in node) return node.resourceUri.fsPath;
  const activeEditor = vscode.window.activeTextEditor;
  return activeEditor ? activeEditor.document.fileName : "";
}

export function notifyFsError(action: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`FhizxAITools: ${action}`, error);
  vscode.window.showErrorMessage(`FhizxAITools: ${action}: ${detail}`);
}
