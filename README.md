# FhizxAITools: Manager de Herramientas de IA 🤖✨

**Fhixx AI Tools Manager** es una extensión para Visual Studio Code diseñada para centralizar, organizar y gestionar tu ecosistema de herramientas de Inteligencia Artificial directamente desde el editor. Permite administrar prompts, agentes, habilidades (skills) y notas en un espacio global personalizado.

## 🚀 Características Principales

- **Gestión Centralizada**: Vistas dedicadas en la barra lateral para:
  - 📝 **Prompts**: Crea y organiza tus instrucciones personalizadas con estructuras específicas de variables y contenido.
  - 🤖 **Agents**: Gestiona los agentes de IA que utilizas habitualmente, definiendo sus roles e instrucciones detalladas.
  - 🛠️ **Skills**: Organiza habilidades específicas por dominio o tarea para flujos de trabajo complejos.
  - 📓 **Notes**: Mantén notas relevantes y rápidas para tu flujo de trabajo con IA en un solo lugar centralizado.

- **Interfaz Intuitiva & Automatizada**: Incluye comandos rápidos, botones de navegación y automatizaciones inteligentes:
  - **Plantillas (Boilerplates)**: Generación automática de estructuras recomendadas al crear nuevos recursos según su categoría.
  - **Convenciones de Nombres**: Aplicación automática de prefijos (`p-`, `a-`, `s-`) para mantener un orden consistente en tu espacio global.
  - **Navegación Rápida**: Menú contextual completo y navegación visual directa desde el explorador lateral.

- **Espacio Global Personalizable**: Define una ruta única mediante la configuración de VS Code donde se almacenarán todos tus recursos, permitiéndote acceder a ellos independientemente del proyecto en el que estés trabajando actualmente.

- **Chat Participant (`@fhizx-ai-tools`)**: Interactúa con tu espacio global directamente desde el chat de Copilot o herramientas integradas usando comandos como `@fhizx-ai-tools usar <nombre>` para cargar contenido instantáneamente a partir de tus archivos locales gestionados por la extensión.

## 🛠️ Instalación y Configuración

1. Instala la extensión desde la Marketplace de VS Code.
2. Ve a la configuración de usuario (`Ctrl+,` o `Cmd+ ,`).
3. Busca **FhizxAITools: Global Path**.
4. Introduce la ruta absoluta donde deseas almacenar tus herramientas (ejemplo: `/Users/tu_usuario/Documents/AI_Tools`).

## 📖 Guía de Uso

### Navegación y Creación
En el panel lateral, podrás ver las secciones correspondientes a Prompts, Agents, Skills y Notes. Utiliza los botones en la barra superior o el menú contextual para:
- **Crear Archivo**: Añade una nueva entrada usando plantillas predefinidas según el tipo de recurso seleccionado (Prompt, Agent, Skill o Nota).
- **Crear Carpeta**: Organiza tus recursos por categorías, proyectos específicos u otros niveles jerárquicos.

### Acciones Rápidas
Selecciona cualquier elemento en las vistas de Fhixx AI Tools y utiliza el menú contextual para:
- ✏️ **Modificar Nombre** (Renombrar archivo/carpeta)
- 🗑️ **Eliminar** recurso seleccionado
- 📂 **Crear Contexto**: Crea rápidamente archivos o carpetas relacionadas manteniendo la estructura.

### Uso del Chat Participant
Una vez configurado tu espacio global, puedes invocar al participante `@fhizx-ai-tools` en el chat para ejecutar acciones basadas en la lógica que hayas definido previamente:
*   **Ejemplo:** `@fhixx-ai-tools usar mi-prompt-de-codigo` -> La extensión buscará recursivamente por `mi-prompt-de-codigo`, cargará su contenido y lo mostrará inmediatamente en el chat.

## ⚙️ Configuración de Comandos

| Comando | Descripción | Icono |
| :--- | :--- | :--- |
| `fhizxAiTools.setGlobalPath` | Seleccionar Ruta Global | $(folder-opened) |
| `fhizxAiTools.createPromptFile` | Crear Prompt nuevo (con prefijo p-) | $(file-add) |
| `fhizxAiTools.createAgentFile` | Crear Agente nuevo (con prefijo a-) | $(file-add) |
| `fhizxAiTools.createSkillFile` | Crear Skill nueva (con prefijo s-) | $(file-add) |
| `fhizxAiTools.createNoteFile` | Crear Nota nueva | $(file-add) |

---
*Desarrollado para potenciar el flujo de trabajo con IA en Visual Studio Code.*