import * as fs from "fs";
import * as path from "path";

/**
 * Utilidades puras para la sincronización con la nube (GitHub).
 * Sin dependencias de VS Code, testables directamente en Node.
 */

/** Archivos/ carpetas que nunca se suben (ruido de sistema o git). */
const IGNORED_NAMES = new Set([
  ".git",
  ".DS_Store",
  "Thumbs.db",
  ".idea",
  ".vscode",
]);

/** Convierte una ruta local a su equivalente relativo con separadores "/" (posix). */
export function toPosixRelativePath(filePath: string, rootDir: string): string {
  const rel = path.relative(rootDir, filePath);
  return rel.split(path.sep).join("/");
}

/**
 * Recorre un directorio y devuelve las rutas relativas (posix) de todos los
 * archivos, excluyendo ruido como `.git` o `.DS_Store`. Devuelve la lista
 * ordenada alfabéticamente para tener resultados deterministas.
 */
export function collectLocalFiles(rootDir: string): string[] {
  const result: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      console.warn(`No se pudo acceder al directorio: ${dir}`);
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        result.push(toPosixRelativePath(fullPath, rootDir));
      }
    }
  };
  walk(rootDir);
  return result.sort((a, b) => a.localeCompare(b));
}

/**
 * Compara los archivos locales con los remotos (rutas posix relativas) y
 * devuelve qué subir y qué eliminar en la nube.
 * - `toUpload`: archivos locales (crear o actualizar).
 * - `toDelete`: archivos remotos que ya no existen localmente.
 */
export function diffLocalVsRemote(
  localFiles: string[],
  remoteFiles: string[],
): { toUpload: string[]; toDelete: string[] } {
  const localSet = new Set(localFiles);
  const remoteSet = new Set(remoteFiles);
  return {
    toUpload: [...localSet].filter((p) => !remoteSet.has(p)).sort(),
    toDelete: [...remoteSet].filter((p) => !localSet.has(p)).sort(),
  };
}
