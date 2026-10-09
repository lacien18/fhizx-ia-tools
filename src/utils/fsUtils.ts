import * as fs from "fs";
import * as path from "path";
import {
  CATEGORY_FILE_EXTENSIONS,
  FILE_EXTENSIONS,
  type CategoryType,
} from "../constants";

const CATEGORY_EXTENSIONS = Object.values(CATEGORY_FILE_EXTENSIONS).sort(
  (first, second) => second.length - first.length,
);

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

export function isCategoryFileName(
  fileName: string,
  category: CategoryType,
): boolean {
  const expectedExtension = CATEGORY_FILE_EXTENSIONS[category];
  if (!fileName.endsWith(expectedExtension)) return false;

  if (category === "notes") {
    return !CATEGORY_EXTENSIONS.some(
      (extension) =>
        extension !== FILE_EXTENSIONS.MARKDOWN && fileName.endsWith(extension),
    );
  }

  return true;
}

export function normalizeCategoryFileName(
  fileName: string,
  category: CategoryType,
): string {
  if (isCategoryFileName(fileName, category)) return fileName;

  const baseName = stripCategoryFileExtension(fileName);
  const normalizedBaseName =
    baseName !== fileName || !path.extname(fileName)
      ? baseName
      : fileName.slice(0, -path.extname(fileName).length);
  return `${normalizedBaseName}${CATEGORY_FILE_EXTENSIONS[category]}`;
}

export function normalizeCategoryFilePath(
  filePath: string,
  category: CategoryType,
): string | undefined {
  const fileName = path.basename(filePath);
  if (fileName.startsWith(".")) return filePath;

  const normalizedName = normalizeCategoryFileName(fileName, category);
  if (normalizedName === fileName) return filePath;

  const extension = CATEGORY_FILE_EXTENSIONS[category];
  const baseName = normalizedName.slice(0, -extension.length);
  let normalizedPath = path.join(path.dirname(filePath), normalizedName);
  let suffix = 2;

  while (fs.existsSync(normalizedPath)) {
    normalizedPath = path.join(
      path.dirname(filePath),
      `${baseName}-${suffix}${extension}`,
    );
    suffix += 1;
  }

  try {
    fs.renameSync(filePath, normalizedPath);
    return normalizedPath;
  } catch (error) {
    console.error(`FhizxAITools: Error al normalizar "${filePath}"`, error);
    return undefined;
  }
}

export function stripCategoryFileExtension(fileName: string): string {
  const lowerCaseFileName = fileName.toLowerCase();
  const extension = CATEGORY_EXTENSIONS.find((candidate) =>
    lowerCaseFileName.endsWith(candidate),
  );
  return extension
    ? fileName.slice(0, -extension.length)
    : fileName;
}

/**
 * Convierte un nombre de archivo al equivalente `.prompt.md` para Copilot.
 * - "p-ejemplo.prompt.md"          -> "p-ejemplo.prompt.md"
 * - "a-ejemplo.agent.md"           -> "a-ejemplo.prompt.md"
 * - "s-ejemplo.skill.md"           -> "s-ejemplo.prompt.md"
 * - "p-ejemplo.instructions.md"    -> "p-ejemplo.prompt.md"
 * - "c-ejemplo.context.md"         -> "c-ejemplo.prompt.md"
 * - "p-ejemplo.md"                 -> "p-ejemplo.prompt.md"
 * - "p-ejemplo"                    -> "p-ejemplo.prompt.md"
 */
export function toPromptFileName(fileName: string): string {
  const baseName = stripCategoryFileExtension(fileName);
  return `${baseName}${FILE_EXTENSIONS.PROMPT_MD}`;
}
