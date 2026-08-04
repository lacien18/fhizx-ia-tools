import * as fs from "fs";
import { FILE_EXTENSIONS } from "../constants";

/**
 * Utilidades puras de sistema de archivos (sin dependencias de VS Code),
 * testables directamente en Node.
 */

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function isDirectory(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

export function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`FhizxAITools: Error al leer "${filePath}"`, error);
    return "";
  }
}

export function deletePath(filePath: string, recursive: boolean): void {
  if (recursive) {
    fs.rmSync(filePath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(filePath);
  }
}

/**
 * Convierte un nombre de archivo al equivalente `.prompt.md` para Copilot.
 * - "p-ejemplo.prompt.md"          -> "p-ejemplo.prompt.md"
 * - "p-ejemplo.instructions.md"    -> "p-ejemplo.prompt.md"
 * - "p-ejemplo.md"                 -> "p-ejemplo.prompt.md"
 * - "p-ejemplo"                    -> "p-ejemplo.prompt.md"
 */
export function toPromptFileName(fileName: string): string {
  if (fileName.endsWith(FILE_EXTENSIONS.PROMPT_MD)) return fileName;
  let baseName = fileName;
  if (baseName.endsWith(".instructions.md")) {
    baseName = baseName.slice(0, -".instructions.md".length);
  } else if (baseName.endsWith(FILE_EXTENSIONS.MARKDOWN)) {
    baseName = baseName.slice(0, -FILE_EXTENSIONS.MARKDOWN.length);
  }
  return `${baseName}${FILE_EXTENSIONS.PROMPT_MD}`;
}
