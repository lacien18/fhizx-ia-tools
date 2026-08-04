# FhizxAITools: Manager de Herramientas de IA 🤖✨

**Fhizx AI Tools Manager** es una extensión para Visual Studio Code diseñada para centralizar, organizar y gestionar tu ecosistema de herramientas de Inteligencia Artificial directamente desde el editor. Permite administrar prompts, agentes, habilidades (skills), contextos (context) y notas en un espacio global personalizado.

## 🚀 Características Principales

- **Gestión Centralizada**: Vistas dedicadas en la barra lateral para:
  - ⚙️ **Configurations**: Centro de control de la extensión. Configura la ruta global, recarga las vistas, consulta el estado de tu configuración y abre o instala/desinstala recursos en Copilot.
  - 📝 **Prompts**: Crea y organiza tus instrucciones personalizadas con estructuras específicas de variables y contenido.
  - 🤖 **Agents**: Gestiona los agentes de IA que utilizas habitualmente, definiendo sus roles e instrucciones detalladas.
  - 🛠️ **Skills**: Organiza habilidades específicas por dominio o tarea para flujos de trabajo complejos.
  - 🧠 **Context**: Gestiona archivos de contexto reutilizables para enriquecer las respuestas de tus asistentes de IA.
  - 📓 **Notes**: Mantén notas relevantes y rápidas para tu flujo de trabajo con IA en un solo lugar centralizado.
  - 🔢 **Token Counter**: Estadísticas en tiempo real del archivo activo: tokens exactos, caracteres, palabras, líneas y costo estimado por modelo (GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet y Gemini Flash).

- **Integración con Copilot**: Instala y desinstala tus prompts, agents, skills y context directamente en Copilot copiándolos a `~/.vscode/github-copilot/<categoría>/`. Los recursos instalados se muestran con indicador verde (✅) y los pendientes de instalar en rojo (❌).

- **Interfaz Intuitiva & Automatizada**: Incluye comandos rápidos, botones de navegación y automatizaciones inteligentes:
  - **Plantillas (Boilerplates)**: Generación automática de estructuras recomendadas al crear nuevos recursos según su categoría.
  - **Convenciones de Nombres**: Aplicación automática de prefijos (`p-`, `a-`, `s-`, `c-`) para mantener un orden consistente en tu espacio global.
  - **Navegación Rápida**: Menú contextual completo y navegación visual directa desde el explorador lateral.

- **Espacio Global Personalizable**: Define una ruta única mediante la configuración de VS Code donde se almacenarán todos tus recursos, permitiéndote acceder a ellos independientemente del proyecto en el que estés trabajando actualmente. Al configurarla, la extensión crea automáticamente las carpetas `prompts`, `agents`, `skills`, `context` y `notes`.

- **Chat Participant (`@fhizx-ai-tools`)**: Interactúa con tu espacio global directamente desde el chat de Copilot o herramientas integradas usando comandos como `@fhizx-ai-tools usar <nombre>` para cargar contenido instantáneamente a partir de tus archivos locales gestionados por la extensión.

## 🛠️ Instalación y Configuración

1. Instala la extensión desde la Marketplace de VS Code.
2. Ve a la configuración de usuario (`Ctrl+,` o `Cmd+ ,`).
3. Busca **FhizxAITools: Global Path**.
4. Introduce la ruta absoluta donde deseas almacenar tus herramientas (ejemplo: `/Users/tu_usuario/Documents/AI_Tools`).

## 📖 Guía de Uso

### Vista Configurations
Esta vista es el centro de control de la extensión:
- **Seleccionar Ruta Global**: Define la carpeta donde se guardarán todos tus recursos.
- **Recargar**: Actualiza todas las vistas (prompts, agents, skills, context, notes y configuración).
- **Estado de la Ruta Global**: Indica si la ruta está configurada (✅) o si aún falta por configurar (❌).
- **Abrir Ruta Global** (icono de carpeta): Abre la ruta global en el explorador de archivos del sistema.
- **Instalar / Desinstalar en Copilot** (icono de sincronización): Alterna la instalación de un recurso en Copilot.

### Navegación y Creación
En el panel lateral podrás ver las secciones correspondientes a Prompts, Agents, Skills, Context y Notes. Utiliza los botones en la barra superior o el menú contextual para:
- **Crear Archivo**: Añade una nueva entrada usando plantillas predefinidas según el tipo de recurso seleccionado (Prompt, Agent, Skill, Context o Nota).
- **Crear Carpeta**: Organiza tus recursos por categorías, proyectos específicos u otros niveles jerárquicos.

### Acciones Rápidas
Selecciona cualquier elemento en las vistas de Fhizx AI Tools y utiliza el menú contextual para:
- 💬 **Enviar al Chat**: Envía el contenido del recurso directamente al chat de Copilot.
- 📋 **Copiar en portapapeles**: Copia el contenido del recurso seleccionado.
- ⬇️ **Instalar / ⬆️ Desinstalar**: Instala o desinstala el recurso en Copilot (disponible en Prompts, Agents, Skills y Context).
- 📂 **Crear Contexto**: Crea rápidamente archivos o carpetas relacionadas dentro de una carpeta, manteniendo la estructura.
- ✏️ **Modificar Nombre**: Renombra el archivo o carpeta seleccionado.
- 🗑️ **Eliminar**: Elimina el recurso seleccionado.

> 💡 También puedes hacer clic derecho sobre cualquier archivo `.md` o `.prompt.md` abierto en el editor para enviarlo al chat de IA.

### Instalar / Desinstalar en Copilot
La instalación copia el archivo (convertido a `.prompt.md` si es necesario) a la carpeta correspondiente de Copilot (`~/.vscode/github-copilot/<categoría>/`) y registra la ruta en la configuración `chat.promptFilesLocations`, de modo que Copilot pueda utilizarlo como prompt de archivo. Al activarse, la extensión registra automáticamente las carpetas de categoría que ya existan.

### Uso del Chat Participant
Una vez configurado tu espacio global, puedes invocar al participante `@fhizx-ai-tools` en el chat para ejecutar acciones basadas en la lógica que hayas definido previamente:
*   **Ejemplo:** `@fhizx-ai-tools usar mi-prompt-de-codigo` -> La extensión buscará recursivamente por `mi-prompt-de-codigo` en tus carpetas de prompts, agents, skills y context, cargará su contenido y lo mostrará inmediatamente en el chat.

## ⚙️ Configuración de Comandos

| Comando | Descripción | Icono |
| :--- | :--- | :--- |
| `fhizxAiTools.setGlobalPath` | Seleccionar Ruta Global | $(folder-opened) |
| `fhizxAiTools.openGlobalPath` | Abrir Ruta Global | $(folder-opened) |
| `fhizxAiTools.refresh` | Refrescar todas las vistas | $(refresh) |
| `fhizxAiTools.createPromptFile` | Crear Prompt nuevo (con prefijo p-) | $(file-add) |
| `fhizxAiTools.createPromptFolder` | Crear carpeta de Prompts | $(new-folder) |
| `fhizxAiTools.createAgentFile` | Crear Agente nuevo (con prefijo a-) | $(file-add) |
| `fhizxAiTools.createAgentFolder` | Crear carpeta de Agents | $(new-folder) |
| `fhizxAiTools.createSkillFile` | Crear Skill nueva (con prefijo s-) | $(file-add) |
| `fhizxAiTools.createSkillFolder` | Crear carpeta de Skills | $(new-folder) |
| `fhizxAiTools.createContextFile` | Crear Context nuevo (con prefijo c-) | $(file-add) |
| `fhizxAiTools.createContextFolder` | Crear carpeta de Context | $(new-folder) |
| `fhizxAiTools.createNoteFile` | Crear Nota nueva | $(file-add) |
| `fhizxAiTools.createNoteFolder` | Crear carpeta de Notes | $(new-folder) |
| `fhizxAiTools.createFileContext` | Crear archivo dentro de una carpeta | $(file-add) |
| `fhizxAiTools.createFolderContext` | Crear subcarpeta dentro de una carpeta | $(new-folder) |
| `fhizxAiTools.renameItem` | Modificar Nombre | $(edit) |
| `fhizxAiTools.deleteItem` | Eliminar recurso | $(trash) |
| `fhizxAiTools.openFile` | Abrir Archivo | — |
| `fhizxAiTools.sendToChat` | Enviar al Chat de IA | $(wand) |
| `fhizxAiTools.copyToClipboard` | Copiar en portapapeles | $(copy) |
| `fhizxAiTools.installItem` | Instalar en Copilot | $(add) |
| `fhizxAiTools.uninstallItem` | Desinstalar de Copilot | $(remove) |
| `fhizxAiTools.toggleInstall` | Instalar / Desinstalar en Copilot | $(sync) |
| `fhizxAiTools.checkForUpdates` | Buscar Actualizaciones | — |

---
*Desarrollado para potenciar el flujo de trabajo con IA en Visual Studio Code.*