import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceTreeDataProvider, WorkspaceItem } from "./treeDataProvider";
import { getEncoding } from "js-tiktoken";

// Inicializamos el codificador una sola vez para optimizar rendimiento
const encoder = getEncoding("cl100k_base");

// Clase para los elementos de métricas en la pestaña Token Counter
class TokenStatItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly statDescription?: string,
    iconName?: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = statDescription;
    this.contextValue = "tokenStat"; // Protegido sin acciones de edición/eliminación
    if (iconName) {
      this.iconPath = new vscode.ThemeIcon(iconName);
    }
  }
}

// Data Provider encargado de calcular y refrescar las métricas del archivo activo
class TokenCounterTreeDataProvider implements vscode.TreeDataProvider<TokenStatItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TokenStatItem | undefined | void
  > = new vscode.EventEmitter<TokenStatItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TokenStatItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor() {
    vscode.window.onDidChangeActiveTextEditor(() => this.refresh());
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (
        vscode.window.activeTextEditor &&
        e.document === vscode.window.activeTextEditor.document
      ) {
        this.refresh();
      }
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TokenStatItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TokenStatItem): Promise<TokenStatItem[]> {
    if (element) {
      return [];
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return [
        new TokenStatItem("Sin archivo activo", "Abre un archivo", "info"),
      ];
    }

    const doc = editor.document;
    const text = doc.getText();
    const fileName = path.basename(doc.fileName);

    // Métricas básicas
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = doc.lineCount;

    let exactTokens = 0;
    try {
      exactTokens = encoder.encode(text).length;
    } catch (error) {
      exactTokens = Math.ceil(charCount / 4);
    }

    const costGPT4o = (exactTokens / 1_000_000) * 2.5;
    const costMini = (exactTokens / 1_000_000) * 0.15;
    const costSonnet = (exactTokens / 1_000_000) * 3.0;
    const costGemini = (exactTokens / 1_000_000) * 0.1;

    return [
      new TokenStatItem("📁 Archivo:", fileName, "file"),
      new TokenStatItem(
        "🔢 Tokens Exactos:",
        exactTokens.toLocaleString(),
        "symbol-number",
      ),
      new TokenStatItem(
        "📏 Caracteres:",
        charCount.toLocaleString(),
        "text-size",
      ),
      new TokenStatItem("📖 Palabras:", wordCount.toLocaleString(), "book"),
      new TokenStatItem(
        "📄 Líneas:",
        lineCount.toLocaleString(),
        "list-ordered",
      ),

      // Sección de Costos Estimados de API (Input)
      new TokenStatItem("--- COSTS BY MODEL ---", "", ""),
      new TokenStatItem(
        "🟢 GPT-4o:",
        `$${costGPT4o.toFixed(5)}`,
        "credit-card",
      ),
      new TokenStatItem(
        "🔵 GPT-4o Mini:",
        `$${costMini.toFixed(5)}`,
        "credit-card",
      ),
      new TokenStatItem(
        "🟠 Claude 3.5 Sonnet:",
        `$${costSonnet.toFixed(5)}`,
        "credit-card",
      ),
      new TokenStatItem(
        "🟣 Gemini Flash:",
        `$${costGemini.toFixed(5)}`,
        "credit-card",
      ),
    ];
  }
}
export function activate(context: vscode.ExtensionContext) {
  const promptsProvider = new WorkspaceTreeDataProvider("prompts");
  const agentsProvider = new WorkspaceTreeDataProvider("agents");
  const skillsProvider = new WorkspaceTreeDataProvider("skills");
  const notesProvider = new WorkspaceTreeDataProvider("notes");
  const tokenCounterProvider = new TokenCounterTreeDataProvider();

  const providers = {
    prompts: promptsProvider,
    agents: agentsProvider,
    skills: skillsProvider,
    notes: notesProvider,
    tokenCounterProvider,
  };

  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.prompts",
    promptsProvider,
  );
  vscode.window.registerTreeDataProvider("fhizxAiTools.agents", agentsProvider);
  vscode.window.registerTreeDataProvider("fhizxAiTools.skills", skillsProvider);
  vscode.window.registerTreeDataProvider("fhizxAiTools.notes", notesProvider);
  vscode.window.registerTreeDataProvider(
    "fhizxAiTools.tokenCounter",
    tokenCounterProvider,
  );

  // Función genérica aislada para crear archivos en su sección correcta con prefijo automático
  async function createNewFile(
    category: "prompts" | "agents" | "skills" | "notes",
    targetNode?: WorkspaceItem,
  ) {
    let basePath = "";
    if (targetNode) {
      const stat = fs.statSync(targetNode.resourceUri.fsPath);
      basePath = stat.isDirectory()
        ? targetNode.resourceUri.fsPath
        : path.dirname(targetNode.resourceUri.fsPath);
      category = getCategoryFromPath(basePath, providers);
    } else {
      basePath = providers[category].getGlobalCategoryPath() || "";
    }

    if (!basePath) {
      vscode.window.showWarningMessage(
        "Por favor configura la ruta global haciendo clic en el icono de configuración de la barra.",
      );
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: `Nombre del archivo para ${category}`,
      placeHolder: "ej. mi-archivo",
    });
    if (!name) return;

    const isNote = category === "notes";
    const extension = isNote ? ".md" : ".prompt.md";

    // Definición de prefijos según la categoría solicitada
    const prefixes: Record<"prompts" | "agents" | "skills" | "notes", string> =
      {
        prompts: "p-",
        agents: "a-",
        skills: "s-",
        notes: "",
      };

    const prefix = prefixes[category];

    // 1. Limpiamos la extensión si el usuario la escribió por accidente
    let cleanName = name.trim();
    if (cleanName.endsWith(extension)) {
      cleanName = cleanName.slice(0, -extension.length);
    }

    // 2. Aseguramos el prefijo correspondiente sin duplicarlo si ya lo escribió
    if (prefix && !cleanName.startsWith(prefix)) {
      cleanName = prefix + cleanName;
    }

    const finalName = `${cleanName}${extension}`;
    const filePath = path.join(basePath, finalName);

    if (fs.existsSync(filePath)) {
      vscode.window.showErrorMessage("El archivo ya existe.");
      return;
    }

    // Reemplazo del texto plano por el boilerplate correspondiente con la particularidad
    const initialContent = getBoilerplateContent(category, name);
    fs.writeFileSync(filePath, initialContent);

    refreshAll();
    vscode.window.showTextDocument(vscode.Uri.file(filePath));
  }

  // Función genérica aislada para crear carpetas en su sección correcta
  async function createNewFolder(
    category: "prompts" | "agents" | "skills" | "notes",
    targetNode?: WorkspaceItem,
  ) {
    let basePath = "";
    if (targetNode) {
      const stat = fs.statSync(targetNode.resourceUri.fsPath);
      basePath = stat.isDirectory()
        ? targetNode.resourceUri.fsPath
        : path.dirname(targetNode.resourceUri.fsPath);
      category = getCategoryFromPath(basePath, providers);
    } else {
      basePath = providers[category].getGlobalCategoryPath() || "";
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
  }

  // Función auxiliar para obtener la plantilla base según la categoría y particularidad
  function getBoilerplateContent(
    category: "prompts" | "agents" | "skills" | "notes",
    rawName: string,
  ): string {
    const title = rawName;
    switch (category) {
      case "prompts":
        return `# Prompt: ${title}\n\n## Descripción\n[Describe brevemente el propósito de este prompt]\n\n## Variables\n- \`{{variable}}\`: Descripción de la variable\n\n## Contenido del Prompt\n[Escribe aquí las instrucciones para la IA]\n`;

      case "agents":
        return `# Agent: ${title}\n\n## Rol y Propósito\n[Define quién es este agente, su personalidad y su objetivo general]\n\n## Instrucciones / Comportamiento\n- Comportamiento o regla 1\n- Comportamiento o regla 2\n\n## Restricciones\n- Qué NO debe hacer el agente\n`;

      case "skills":
        return `# Skill: ${title}\n\n## Objetivo\n[Describe la habilidad o tarea técnica específica que automatiza esta skill]\n\n## Pasos de Ejecución\n1. Paso inicial...\n2. Paso de procesamiento...\n\n## Resultado Esperado\n[Describe el formato de salida o entregable]\n`;

      case "notes":
        return `# Nota: ${title}\n\n## Resumen\n[Apunta aquí notas rápidas, ideas o referencias]\n\n---\n\n`;

      default:
        return `# ${title}\n`;
    }
  }

  context.subscriptions.push(
    // Comando para enviar el archivo actual al Chat de IA (Copilot / Chat integrado)
    vscode.commands.registerCommand(
      "fhizxAiTools.sendToChat",
      async (node?: WorkspaceItem | vscode.Uri) => {
        let filePath = "";

        // Determinar si la llamada viene del árbol lateral, de una URI o del editor activo
        if (node && "resourceUri" in node) {
          filePath = node.resourceUri.fsPath;
        } else if (node instanceof vscode.Uri) {
          filePath = node.fsPath;
        } else if (vscode.window.activeTextEditor) {
          filePath = vscode.window.activeTextEditor.document.fileName;
        }

        if (!filePath || !fs.existsSync(filePath)) {
          vscode.window.showWarningMessage(
            "Por favor selecciona o abre un archivo válido para enviar al chat.",
          );
          return;
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const fileName = path.basename(filePath);

        try {
          // Intenta abrir el chat nativo de VS Code / Copilot pre-llenando la consulta con el contenido
          await vscode.commands.executeCommand("workbench.action.chat.open", {
            query: `Usa el siguiente recurso (${fileName}):\n\n${content}`,
          });
        } catch (error) {
          // Fallback de seguridad: Copia al portapapeles y abre el chat si el comando directo no está disponible
          await vscode.env.clipboard.writeText(content);
          vscode.commands.executeCommand("workbench.action.chat.open");
          vscode.window.showInformationMessage(
            `El contenido de "${fileName}" se copió al portapapeles y se abrió el chat.`,
          );
        }
      },
    ),

    vscode.commands.registerCommand("fhizxAiTools.refresh", () => {
      refreshAll();
      vscode.window.showInformationMessage("Archivos y carpetas actualizados");
    }),

    vscode.commands.registerCommand("fhizxAiTools.setGlobalPath", async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Seleccionar carpeta raíz global para FhizxAITools",
      });

      if (uri && uri[0]) {
        const selectedPath = uri[0].fsPath;
        await vscode.workspace
          .getConfiguration("fhizxAiTools")
          .update(
            "globalPath",
            selectedPath,
            vscode.ConfigurationTarget.Global,
          );

        const categories: ("prompts" | "agents" | "skills" | "notes")[] = [
          "prompts",
          "agents",
          "skills",
          "notes",
        ];
        for (const cat of categories) {
          const subPath = path.join(selectedPath, cat);
          if (!fs.existsSync(subPath)) {
            fs.mkdirSync(subPath, { recursive: true });
          }
        }

        vscode.window.showInformationMessage(
          `Ruta global configurada en: ${selectedPath}`,
        );
        refreshAll();
      }
    }),

    vscode.commands.registerCommand(
      "fhizxAiTools.openFile",
      (uri: vscode.Uri) => {
        vscode.window.showTextDocument(uri);
      },
    ),

    // Comandos específicos de Prompts
    vscode.commands.registerCommand("fhizxAiTools.createPromptFile", () =>
      createNewFile("prompts"),
    ),
    vscode.commands.registerCommand("fhizxAiTools.createPromptFolder", () =>
      createNewFolder("prompts"),
    ),

    // Comandos específicos de Agents
    vscode.commands.registerCommand("fhizxAiTools.createAgentFile", () =>
      createNewFile("agents"),
    ),
    vscode.commands.registerCommand("fhizxAiTools.createAgentFolder", () =>
      createNewFolder("agents"),
    ),

    // Comandos específicos de Skills
    vscode.commands.registerCommand("fhizxAiTools.createSkillFile", () =>
      createNewFile("skills"),
    ),
    vscode.commands.registerCommand("fhizxAiTools.createSkillFolder", () =>
      createNewFolder("skills"),
    ),

    // Comandos específicos de Notes
    vscode.commands.registerCommand("fhizxAiTools.createNoteFile", () =>
      createNewFile("notes"),
    ),
    vscode.commands.registerCommand("fhizxAiTools.createNoteFolder", () =>
      createNewFolder("notes"),
    ),

    // Comandos para menú contextual (clic derecho en carpetas existentes)
    vscode.commands.registerCommand(
      "fhizxAiTools.createFileContext",
      (node: WorkspaceItem) => createNewFile("prompts", node),
    ),
    vscode.commands.registerCommand(
      "fhizxAiTools.createFolderContext",
      (node: WorkspaceItem) => createNewFolder("prompts", node),
    ),

    vscode.commands.registerCommand(
      "fhizxAiTools.renameItem",
      async (node: WorkspaceItem) => {
        if (!node) return;
        const oldPath = node.resourceUri.fsPath;
        const parsedPath = path.parse(oldPath);

        const newName = await vscode.window.showInputBox({
          prompt: "Modificar nombre",
          value: parsedPath.name,
        });
        if (!newName) return;

        const finalNewName = newName.endsWith(parsedPath.ext)
          ? newName
          : `${newName}${parsedPath.ext}`;
        const newPath = path.join(parsedPath.dir, finalNewName);

        if (fs.existsSync(newPath)) {
          vscode.window.showErrorMessage(
            "Ya existe un elemento con ese nombre.",
          );
          return;
        }

        fs.renameSync(oldPath, newPath);
        refreshAll();
        vscode.window.showInformationMessage(
          "Elemento modificado exitosamente.",
        );
      },
    ),

    vscode.commands.registerCommand(
      "fhizxAiTools.deleteItem",
      async (node: WorkspaceItem) => {
        if (!node) return;
        const confirm = await vscode.window.showWarningMessage(
          `¿Deseas eliminar "${node.label}"?`,
          { modal: true },
          "Eliminar",
        );
        if (confirm === "Eliminar") {
          if (node.isFolder) {
            fs.rmSync(node.resourceUri.fsPath, {
              recursive: true,
              force: true,
            });
          } else {
            fs.unlinkSync(node.resourceUri.fsPath);
          }
          refreshAll();
          vscode.window.showInformationMessage("Elemento eliminado.");
        }
      },
    ),

    vscode.commands.registerCommand("fhizxAiTools.checkForUpdates", () => {
      vscode.window.showInformationMessage(
        "FhizxAITools se encuentra actualizado.",
      );
    }),
  );

  // Integración del chat IA (@fhizx-ai-tools)
  const chatParticipant = vscode.chat.createChatParticipant(
    "fhizx-ai-tools.participant",
    async (request, context, response, token) => {
      const promptQuery = request.prompt.trim();
      const globalPath = vscode.workspace
        .getConfiguration("fhizxAiTools")
        .get<string>("globalPath");

      if (!globalPath) {
        response.markdown("Configura la ruta global de la extensión primero.");
        return;
      }

      const match = promptQuery.match(/usar\s+(.+)/i);
      if (match) {
        const promptName = match[1].trim();
        // Buscar primero en prompts, luego en agents y skills por si se invocan desde el chat
        let promptFilePath = findFileRecursive(
          path.join(globalPath, "prompts"),
          promptName,
        );
        if (!promptFilePath)
          promptFilePath = findFileRecursive(
            path.join(globalPath, "agents"),
            promptName,
          );
        if (!promptFilePath)
          promptFilePath = findFileRecursive(
            path.join(globalPath, "skills"),
            promptName,
          );

        if (promptFilePath && fs.existsSync(promptFilePath)) {
          const content = fs.readFileSync(promptFilePath, "utf-8");
          response.markdown(
            `### Recurso cargado: \`${promptName}\`\n\n${content}`,
          );
          return;
        } else {
          response.markdown(
            `No se encontró el recurso \`${promptName}\` en tu espacio de trabajo global.`,
          );
          return;
        }
      }

      response.markdown(
        "Usa `@fhizx-ai-tools usar <nombre>` para invocar tus prompts, agents o skills.",
      );
    },
  );

  chatParticipant.iconPath = vscode.Uri.file(
    path.join(context.extensionPath, "media", "icon.svg"),
  );
  context.subscriptions.push(chatParticipant);

  function refreshAll() {
    promptsProvider.refresh();
    agentsProvider.refresh();
    skillsProvider.refresh();
    notesProvider.refresh();
  }

  function getCategoryFromPath(
    targetPath: string,
    provs: any,
  ): "prompts" | "agents" | "skills" | "notes" {
    for (const key of ["prompts", "agents", "skills", "notes"] as const) {
      const catPath = provs[key].getGlobalCategoryPath();
      if (catPath && targetPath.startsWith(catPath)) {
        return key;
      }
    }
    return "prompts";
  }

  function findFileRecursive(dir: string, name: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findFileRecursive(fullPath, name);
        if (found) return found;
      } else if (
        entry.isFile() &&
        (entry.name === name ||
          entry.name.replace(/\.prompt\.md$/, "") === name)
      ) {
        return fullPath;
      }
    }
    return null;
  }

  const config = vscode.workspace.getConfiguration("fhizxAiTools");
  if (!config.get<string>("globalPath")) {
    vscode.window
      .showInformationMessage(
        "Bienvenido a FhizxAITools. Selecciona tu ruta de almacenamiento global.",
        "Seleccionar Ruta",
      )
      .then((selection) => {
        if (selection === "Seleccionar Ruta") {
          vscode.commands.executeCommand("fhizxAiTools.setGlobalPath");
        }
      });
  }
}

export function deactivate() {}
