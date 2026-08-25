import * as fs from "fs";
import * as path from "path";
import { InstallationService } from "../services/installationService";
import {
  CATEGORIES,
  COPILOT_CATEGORIES,
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  FILE_EXTENSIONS,
  MODEL_PRICES,
  TOKENS_PER_MILLION,
  ENCODING_NAME,
  type CategoryType,
} from "../constants";

export interface FileEntry {
  name: string;
  path: string;
  isFolder: boolean;
  isInstalled: boolean;
  children?: FileEntry[];
}

/**
 * Build the file tree for a category.
 */
export function buildFileTree(
  dirPath: string,
  category: CategoryType,
): FileEntry[] {
  if (!fs.existsSync(dirPath)) return [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items: FileEntry[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: fullPath,
          isFolder: true,
          isInstalled: false,
          children: buildFileTree(fullPath, category),
        });
      } else if (entry.isFile() && validateExtension(entry.name, category)) {
        items.push({
          name: entry.name,
          path: fullPath,
          isFolder: false,
          isInstalled: InstallationService.isInstalled(entry.name, category),
        });
      }
    }

    return items.sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });
  } catch {
    return [];
  }
}

function validateExtension(fileName: string, category: CategoryType): boolean {
  if (category === "notes") {
    return (
      fileName.endsWith(FILE_EXTENSIONS.MARKDOWN) &&
      !fileName.endsWith(FILE_EXTENSIONS.PROMPT_MD)
    );
  }
  return fileName.endsWith(FILE_EXTENSIONS.PROMPT_MD);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render file list HTML for a category panel.
 */
export function renderCategoryPanel(
  items: FileEntry[],
  category: CategoryType,
): string {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-text">Sin archivos</div>
      </div>
    `;
  }

  return `<ul class="item-list">${items.map((item) => renderItem(item, category)).join("")}</ul>`;
}

function renderItem(item: FileEntry, category: CategoryType): string {
  const escapedPath = escapeHtml(item.path);
  const escapedName = escapeHtml(item.name);

  if (item.isFolder) {
    const childrenHtml = item.children
      ? item.children.map((c) => renderItem(c, category)).join("")
      : "";
    return `
      <li>
        <div class="item" data-type="folder" data-path="${escapedPath}" data-category="${category}">
          <span class="chevron">▸</span>
          <span class="item-icon folder">📁</span>
          <span class="item-label">${escapedName}</span>
          <div class="item-actions">
            <button class="icon-btn" data-action="createFileContext" data-category="${category}" title="Crear archivo">📄</button>
            <button class="icon-btn" data-action="createFolderContext" data-category="${category}" title="Crear carpeta">📁</button>
          </div>
        </div>
        <ul class="children collapsed">${childrenHtml}</ul>
      </li>
    `;
  }

  const isNotes = category === "notes";
  const statusIcon = isNotes ? "📝" : item.isInstalled ? "●" : "○";
  const statusClass = isNotes
    ? ""
    : item.isInstalled
      ? "installed"
      : "uninstalled";

  return `
    <li>
      <div class="item" data-type="file" data-path="${escapedPath}" data-category="${category}" data-installed="${item.isInstalled}">
        <span class="item-icon ${statusClass}">${statusIcon}</span>
        <span class="item-label">${escapedName}</span>
        <div class="item-actions">
          <button class="icon-btn" data-action="preview" title="Previsualizar">👁</button>
          <button class="icon-btn" data-action="sendToChat" title="Enviar al chat">✨</button>
          <button class="icon-btn" data-action="copyToClipboard" title="Copiar">📋</button>
          <button class="icon-btn item-menu-trigger" title="Más opciones">⋯</button>
        </div>
      </div>
    </li>
  `;
}

/**
 * Render the configurations panel HTML.
 */
export function renderConfigPanel(config: {
  globalPath: string;
  isConfigured: boolean;
  isCloudConnected: boolean;
  cloudRepo: string;
  autoSync: boolean;
}): string {
  const statusBadge = config.isConfigured
    ? `<span class="badge success">✓ Configurado</span>`
    : `<span class="badge warning">⚠ Sin configurar</span>`;

  const cloudStatus = config.isCloudConnected
    ? `<span class="badge success">✓ ${escapeHtml(config.cloudRepo)}</span>`
    : `<span class="badge warning">No conectado</span>`;

  return `
    <!-- Local Storage -->
    <div class="config-card">
      <div class="config-card-title">Almacenamiento Local</div>
      <div class="config-card-desc">${config.isConfigured ? escapeHtml(config.globalPath) : "Sin ruta configurada"}</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn" data-action="setGlobalPath">Seleccionar Ruta</button>
        <button class="btn secondary" data-action="openGlobalPath">Abrir</button>
        ${statusBadge}
      </div>
    </div>

    <!-- Cloud -->
    <div class="config-card">
      <div class="config-card-title">Almacenamiento Nube (GitHub)</div>
      <div class="config-card-desc">${config.isCloudConnected ? `Conectado · auto-sync ${config.autoSync ? "activado" : "desactivado"}` : "Guarda tus archivos en un repo privado gratuito."}</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${
          config.isCloudConnected
            ? `
          <button class="btn secondary" data-action="cloudPush">↑ Subir</button>
          <button class="btn secondary" data-action="cloudPull">↓ Bajar</button>
          <button class="btn secondary" data-action="cloudToggleAutoSync">${config.autoSync ? "Desactivar" : "Activar"} Auto-sync</button>
          <button class="btn secondary" data-action="cloudDisconnect">Desconectar</button>
        `
            : `
          <button class="btn" data-action="cloudConnect">Conectar</button>
        `
        }
        ${cloudStatus}
      </div>
    </div>

    <!-- Actions -->
    <div class="config-card">
      <div class="config-card-title">Acciones</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn secondary" data-action="refresh">↻ Recargar todo</button>
        <button class="btn secondary" data-action="toggleInstall">Instalar / Desinstalar en Copilot</button>
        <button class="btn secondary" data-action="checkForUpdates">Buscar Actualizaciones</button>
      </div>
    </div>
  `;
}

/**
 * Render token counter panel HTML.
 */
export function renderTokenPanel(
  stats: {
    fileName: string;
    tokens: number;
    characters: number;
    words: number;
    lines: number;
    costs: { model: string; cost: string }[];
  } | null,
  files: { name: string; path: string }[] = [],
): string {
  const fileListHtml = `
    <div class="config-card" style="margin-bottom:8px;">
      <div class="config-card-title">Seleccionar archivo</div>
      <input class="search-input" id="token-file-search" type="text" placeholder="Buscar archivo..." />
      <ul class="file-picker-list" id="token-file-list">
        ${files.map((f) => `<li class="file-picker-item" data-path="${escapeHtml(f.path)}">${escapeHtml(f.name)}</li>`).join("")}
      </ul>
      ${stats ? `<button class="btn secondary" style="margin-top:6px;width:100%;" data-action="clearTokenFile">Usar archivo activo del editor</button>` : ""}
    </div>
  `;

  if (!stats) {
    return `
      ${fileListHtml}
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">Selecciona un archivo o abre uno en el editor.</div>
      </div>
    `;
  }

  return `
    ${fileListHtml}
    <div class="config-card" style="margin-bottom:8px;">
      <div class="config-card-title" style="opacity:0.6; font-size:11px;">Archivo</div>
      <div class="config-card-desc" style="opacity:1; font-weight:500;">${escapeHtml(stats.fileName)}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Tokens</div>
        <div class="stat-value">${stats.tokens.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Caracteres</div>
        <div class="stat-value">${stats.characters.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Palabras</div>
        <div class="stat-value">${stats.words.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Líneas</div>
        <div class="stat-value">${stats.lines.toLocaleString()}</div>
      </div>
    </div>

    <div class="config-card" style="margin-top:8px;">
      <div class="config-card-title">Costo por Modelo</div>
      <ul class="cost-list">
        ${stats.costs.map((c) => `<li class="cost-item"><span class="cost-model">${escapeHtml(c.model)}</span><span class="cost-value">${c.cost}</span></li>`).join("")}
      </ul>
    </div>
  `;
}
