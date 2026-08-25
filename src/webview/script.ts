/**
 * Script that runs inside the webview. Handles accordion sections, context menus,
 * folder expand/collapse, and message passing to the extension host.
 */
export function getScript(): string {
  return /* js */ `
    const vscode = acquireVsCodeApi();

    // ── Tab switching ──
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
        return;
      }

      // Accordion toggle
      const header = e.target.closest('.accordion-header');
      if (header && !e.target.closest('.icon-btn')) {
        const section = header.closest('.accordion-section');
        if (section) section.classList.toggle('open');
        return;
      }

      // Folder toggle
      const folderItem = e.target.closest('.item[data-type="folder"]');
      if (folderItem && !e.target.closest('.icon-btn')) {
        const children = folderItem.nextElementSibling;
        if (children && children.classList.contains('children')) {
          children.classList.toggle('collapsed');
          const chevron = folderItem.querySelector('.chevron');
          if (chevron) {
            chevron.textContent = children.classList.contains('collapsed') ? '▸' : '▾';
          }
        }
        return;
      }

      // File click (open)
      const fileItem = e.target.closest('.item[data-type="file"]');
      if (fileItem && !e.target.closest('.icon-btn')) {
        vscode.postMessage({ type: 'openFile', path: fileItem.dataset.path });
        return;
      }

      // Icon button click
      const iconBtn = e.target.closest('.icon-btn');
      if (iconBtn) {
        // Inline menu trigger → open context menu at button position
        if (iconBtn.classList.contains('item-menu-trigger')) {
          const itemEl = iconBtn.closest('.item');
          if (itemEl) showContextMenuForItem(itemEl, iconBtn);
          return;
        }
        const action = iconBtn.dataset.action;
        const itemEl = iconBtn.closest('.item');
        const path = itemEl ? itemEl.dataset.path : undefined;
        const category = iconBtn.dataset.category || (itemEl ? itemEl.dataset.category : undefined);
        vscode.postMessage({ type: action, path, category });
        return;
      }

      // Button click
      const btn = e.target.closest('.btn');
      if (btn && btn.dataset.action) {
        vscode.postMessage({
          type: btn.dataset.action,
          path: btn.dataset.path,
          category: btn.dataset.category,
        });
        return;
      }

      // File picker item click
      const pickerItem = e.target.closest('.file-picker-item');
      if (pickerItem && pickerItem.dataset.path) {
        vscode.postMessage({ type: 'selectFileForTokens', path: pickerItem.dataset.path });
        return;
      }

      // Close context menu
      closeContextMenu();
    });

    // ── Context menu (right-click) ──
    document.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.item');
      if (!item) return;
      e.preventDefault();
      showContextMenuForItem(item, { getBoundingClientRect: () => ({ left: e.clientX, bottom: e.clientY - 2 }) });
    });

    function menuItem(action, label, filePath, category) {
      return '<div class="context-menu-item" data-action="' + action + '" data-path="' + escape(filePath || '') + '" data-category="' + (category || '') + '">' + label + '</div>';
    }

    function escape(s) {
      return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    }

    function closeContextMenu() {
      const menu = document.getElementById('context-menu');
      if (menu) menu.classList.remove('visible');
    }

    function showContextMenuForItem(item, anchor) {
      const menu = document.getElementById('context-menu');
      if (!menu) return;

      const isFile = item.dataset.type === 'file';
      const isFolder = item.dataset.type === 'folder';
      const isInstalled = item.dataset.installed === 'true';
      const category = item.dataset.category;
      const filePath = item.dataset.path;
      const isNotes = category === 'notes';

      let html = '';
      if (isFile) {
        html += menuItem('preview', '👁 Previsualizar', filePath, category);
        html += menuItem('sendToChat', '✨ Enviar al Chat', filePath, category);
        html += menuItem('copyToClipboard', '📋 Copiar', filePath, category);
        html += menuItem('exportToPdf', '📄 Guardar como PDF', filePath, category);
        if (!isNotes) {
          html += '<div class="context-menu-separator"></div>';
          if (isInstalled) {
            html += menuItem('uninstallItem', '➖ Desinstalar de Copilot', filePath, category);
          } else {
            html += menuItem('installItem', '➕ Instalar en Copilot', filePath, category);
          }
        }
      }
      if (isFolder) {
        html += menuItem('createFileContext', '📄 Crear Archivo', filePath, category);
        html += menuItem('createFolderContext', '📁 Crear Carpeta', filePath, category);
      }
      html += '<div class="context-menu-separator"></div>';
      html += menuItem('renameItem', '✏️ Renombrar', filePath, category);
      html += menuItem('deleteItem', '🗑 Eliminar', filePath, category);

      menu.innerHTML = html;

      const rect = anchor.getBoundingClientRect();
      menu.style.left = rect.left + 'px';
      menu.style.top = (rect.bottom + 2) + 'px';
      menu.classList.add('visible');

      menu.querySelectorAll('.context-menu-item').forEach(el => {
        el.addEventListener('click', () => {
          vscode.postMessage({
            type: el.dataset.action,
            path: el.dataset.path,
            category: el.dataset.category,
          });
          closeContextMenu();
        });
      });
    }

    // ── Drag-and-drop reorder ──
    let draggedSection = null;

    document.addEventListener('dragstart', (e) => {
      const section = e.target.closest('.accordion-section');
      if (!section) return;
      draggedSection = section;
      section.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    document.addEventListener('dragend', (e) => {
      if (draggedSection) draggedSection.classList.remove('dragging');
      draggedSection = null;
      document.querySelectorAll('.accordion-section').forEach(s => {
        s.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      const section = e.target.closest('.accordion-section');
      if (!section || section === draggedSection) return;
      e.dataTransfer.dropEffect = 'move';
      const rect = section.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      section.classList.toggle('drag-over-top', e.clientY < mid);
      section.classList.toggle('drag-over-bottom', e.clientY >= mid);
    });

    document.addEventListener('dragleave', (e) => {
      const section = e.target.closest('.accordion-section');
      if (section) section.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('.accordion-section');
      if (!target || !draggedSection || target === draggedSection) return;
      const rect = target.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) {
        target.parentNode.insertBefore(draggedSection, target);
      } else {
        target.parentNode.insertBefore(draggedSection, target.nextSibling);
      }
      target.classList.remove('drag-over-top', 'drag-over-bottom');
      saveSectionOrder();
    });

    function saveSectionOrder() {
      const order = Array.from(document.querySelectorAll('.accordion-section'))
        .map(s => s.dataset.section);
      vscode.setState({ sectionOrder: order });
      vscode.postMessage({ type: 'saveSectionOrder', order });
    }

    // Restore order from webview state on load
    (function restoreOrder() {
      const state = vscode.getState();
      if (!state || !state.sectionOrder) return;
      const container = document.querySelector('.accordion-section')?.parentNode;
      if (!container) return;
      for (const id of state.sectionOrder) {
        const section = container.querySelector('[data-section="' + id + '"]');
        if (section) container.appendChild(section);
      }
    })();

    // ── Messages from extension ──
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'update') {
        const panel = document.getElementById('panel-' + msg.panel) || document.getElementById('tab-' + msg.panel);
        if (panel) panel.innerHTML = msg.html;
      } else if (msg.type === 'updateAll') {
        for (const [panelId, html] of Object.entries(msg.panels)) {
          const panel = document.getElementById('panel-' + panelId) || document.getElementById('tab-' + panelId);
          if (panel) panel.innerHTML = html;
        }
      }
    });

    // ── File picker search filter ──
    document.addEventListener('input', (e) => {
      if (e.target.id === 'token-file-search') {
        const query = e.target.value.toLowerCase();
        const list = document.getElementById('token-file-list');
        if (!list) return;
        list.querySelectorAll('.file-picker-item').forEach(item => {
          const text = item.textContent.toLowerCase();
          item.classList.toggle('hidden', !text.includes(query));
        });
      }
    });
  `;
}
