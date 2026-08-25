import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

export function exportToPdf(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    vscode.window.showWarningMessage("El archivo no existe.");
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath, path.extname(filePath));
  const htmlBody = md.render(content);

  // Write to temp file and open in browser where print-to-PDF works
  const tmpFile = path.join(
    os.tmpdir(),
    `fhizx-pdf-${fileName}-${Date.now()}.html`,
  );
  fs.writeFileSync(tmpFile, buildPrintableHtml(fileName, htmlBody), "utf-8");
  void vscode.env.openExternal(vscode.Uri.file(tmpFile));
}

function buildPrintableHtml(title: string, body: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #333;
      background: #fff;
      line-height: 1.7;
      padding: 32px 48px;
      max-width: 800px;
      margin: 0 auto;
    }
    .toolbar {
      position: sticky;
      top: 0;
      display: flex;
      gap: 8px;
      padding: 12px 0;
      margin-bottom: 16px;
      background: #fff;
      border-bottom: 1px solid #ddd;
      z-index: 10;
    }
    .toolbar button {
      padding: 6px 16px;
      font-size: 13px;
      font-family: inherit;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #fff;
      background: #007acc;
    }
    .toolbar button:hover { background: #005a9e; }
    .toolbar .hint {
      font-size: 12px;
      opacity: 0.6;
      align-self: center;
      margin-left: 8px;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.4em; font-weight: 600; }
    h1 { font-size: 1.8em; border-bottom: 2px solid #ddd; padding-bottom: 0.3em; }
    h2 { font-size: 1.4em; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
    h3 { font-size: 1.2em; }
    p { margin: 0.6em 0; }
    a { color: #007acc; text-decoration: none; }
    ul, ol { margin: 0.6em 0 0.6em 1.5em; }
    li { margin: 0.2em 0; }
    code {
      font-family: "SF Mono", "Fira Code", Consolas, monospace;
      font-size: 0.9em;
      background: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
    }
    pre {
      background: #f5f5f5;
      padding: 12px 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0.8em 0;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 3px solid #007acc;
      padding: 4px 16px;
      margin: 0.8em 0;
      opacity: 0.85;
    }
    table {
      border-collapse: collapse;
      margin: 0.8em 0;
      width: 100%;
      font-size: 0.95em;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px 10px;
      text-align: left;
    }
    th { font-weight: 600; background: #f5f5f5; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
    img { max-width: 100%; }

    @media print {
      .toolbar { display: none; }
      body { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="printBtn">Guardar como PDF</button>
    <span class="hint">Selecciona "Guardar como PDF" en el diálogo de impresión</span>
  </div>
  <article>${body}</article>
  <script>
    document.getElementById('printBtn').addEventListener('click', function() { window.print(); });
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}
