/**
 * Base CSS for the webview UI. Uses VS Code CSS variables for theme integration.
 */
export function getStyles(): string {
  return /* css */ `
    :root {
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --spacing-xl: 24px;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --transition: 150ms ease;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      line-height: 1.4;
      overflow-x: hidden;
    }

    /* ── Accordion ── */
    .accordion-section {
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
    }

    .accordion-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-sm);
      background: var(--vscode-sideBarSectionHeader-background, var(--vscode-sideBar-background));
      cursor: pointer;
      user-select: none;
      transition: background var(--transition);
    }
    .accordion-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .accordion-chevron {
      font-size: 10px;
      transition: transform var(--transition);
      opacity: 0.6;
      flex-shrink: 0;
    }
    .accordion-section.open .accordion-chevron {
      transform: rotate(90deg);
    }

    .accordion-title {
      flex: 1;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--vscode-foreground);
      opacity: 0.85;
    }

    .accordion-actions {
      display: flex;
      gap: 2px;
    }

    .accordion-body {
      max-height: 0;
      overflow: hidden;
      transition: max-height 200ms ease;
    }
    .accordion-section.open .accordion-body {
      max-height: 2000px;
    }

    /* Drag-and-drop reorder */
    .accordion-header {
      cursor: grab;
    }
    .accordion-section.dragging {
      opacity: 0.4;
    }
    .accordion-section.drag-over-top {
      border-top: 2px solid var(--vscode-focusBorder);
    }
    .accordion-section.drag-over-bottom {
      border-bottom: 2px solid var(--vscode-focusBorder);
    }

    .accordion-content {
      padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
    }

    /* ── Bottom Tabs ── */
    .bottom-tabs {
      margin-top: var(--spacing-xs);
    }
    .tab-bar {
      display: flex;
      gap: 0;
      background: var(--vscode-sideBarSectionHeader-background, var(--vscode-sideBar-background));
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
    }
    .tab {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.5;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: opacity var(--transition), border-color var(--transition);
    }
    .tab:hover { opacity: 0.8; }
    .tab.active {
      opacity: 1;
      border-bottom-color: var(--vscode-focusBorder);
    }
    .tab-panel {
      display: none;
      padding: var(--spacing-md);
    }
    .tab-panel.active { display: block; }

    /* ── File Picker (Token search) ── */
    .search-input {
      width: 100%;
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 12px;
      font-family: var(--vscode-font-family);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: var(--radius-sm);
      outline: none;
      margin-bottom: var(--spacing-xs);
    }
    .search-input:focus {
      border-color: var(--vscode-focusBorder);
    }
    .file-picker-list {
      list-style: none;
      max-height: 120px;
      overflow-y: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius-sm);
    }
    .file-picker-item {
      padding: 3px var(--spacing-sm);
      font-size: 12px;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-picker-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .file-picker-item.hidden { display: none; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Action Buttons (icon buttons in headers) ── */
    .actions {
      display: flex;
      gap: var(--spacing-xs);
    }
    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.6;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: opacity var(--transition), background var(--transition);
    }
    .icon-btn:hover {
      opacity: 1;
      background: var(--vscode-toolbar-hoverBackground);
    }

    /* ── File/Folder List ── */
    .item-list {
      list-style: none;
    }

    .item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition);
      position: relative;
    }
    .item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .item.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .item-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .item-icon.installed { color: var(--vscode-testing-iconPassed); }
    .item-icon.uninstalled { color: var(--vscode-testing-iconFailed); }
    .item-icon.folder { color: var(--vscode-icon-foreground); opacity: 0.8; }

    .item-label {
      flex: 1;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-actions {
      display: none;
      gap: 2px;
    }
    .item:hover .item-actions { display: flex; }

    /* ── Nested items (children of folders) ── */
    .children {
      list-style: none;
      padding-left: var(--spacing-lg);
    }
    .children.collapsed { display: none; }

    /* ── Config Section ── */
    .config-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-sm);
    }
    .config-card-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }
    .config-card-desc {
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: var(--spacing-sm);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-md);
      font-size: 12px;
      font-family: var(--vscode-font-family);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition), opacity var(--transition);
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    /* ── Status Badge ── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 2px var(--spacing-sm);
      font-size: 11px;
      border-radius: 10px;
      font-weight: 500;
    }
    .badge.success {
      background: var(--vscode-testing-iconPassed);
      color: #fff;
      opacity: 0.9;
    }
    .badge.warning {
      background: var(--vscode-testing-iconFailed);
      color: #fff;
      opacity: 0.9;
    }

    /* ── Token Counter ── */
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-sm);
    }
    .stat-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm) var(--spacing-md);
    }
    .stat-label {
      font-size: 11px;
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 16px;
      font-weight: 600;
      margin-top: 2px;
    }
    .stat-card.full-width {
      grid-column: span 2;
    }

    .cost-list {
      list-style: none;
    }
    .cost-item {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-xs) 0;
      font-size: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .cost-item:last-child { border-bottom: none; }
    .cost-model { opacity: 0.8; }
    .cost-value { font-weight: 600; font-variant-numeric: tabular-nums; }

    /* ── Empty State ── */
    .empty-state {
      text-align: center;
      padding: var(--spacing-xl) var(--spacing-md);
      opacity: 0.6;
    }
    .empty-state-icon {
      font-size: 32px;
      margin-bottom: var(--spacing-sm);
    }
    .empty-state-text {
      font-size: 12px;
    }

    /* ── Context menu (right-click) ── */
    .context-menu {
      position: fixed;
      z-index: 1000;
      background: var(--vscode-menu-background);
      border: 1px solid var(--vscode-menu-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-xs) 0;
      min-width: 160px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
    }
    .context-menu.visible { display: block; }
    .context-menu-item {
      padding: var(--spacing-xs) var(--spacing-md);
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--vscode-menu-foreground);
    }
    .context-menu-item:hover {
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
    }
    .context-menu-separator {
      height: 1px;
      background: var(--vscode-menu-separatorBackground);
      margin: var(--spacing-xs) 0;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
    }
  `;
}
