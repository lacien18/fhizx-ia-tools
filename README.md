# FhizxAITools: Manager de Herramientas de IA 🤖✨

**Fhixx AI Tools Manager** es una extensión para Visual Studio Code diseñada para centralizar, organizar y gestionar tu ecosistema de herramientas de Inteligencia Artificial directamente desde el editor. Permite administrar prompts, agentes, habilidades (skills) y notas en un espacio global personalizado.

## 🚀 Características Principales

- **Gestión Centralizada**: Vistas dedicadas en la barra lateral para:
  - 📝 **Prompts**: Crea y organiza tus instrucciones personalizadas.
  - 🤖 **Agents**: Gestiona los agentes de IA que utilizas habitualmente.
  - 🛠️ **Skills**: Organiza habilidades específicas por dominio o tarea.
  - 📓 **Notes**: Mantén notas relevantes para tu flujo de trabajo con IA.

- **Interfaz Intuitiva**: Incluye comandos rápidos en el menú contextual y botones de navegación para crear archivos, carpetas y realizar acciones básicas (renombrar, eliminar) directamente desde las vistas del explorador.

- **Espacio Global Personalizable**: Define una ruta global mediante la configuración de VS Code donde se almacenarán todos tus recursos, permitiéndote acceder a ellos independientemente del proyecto en el que estés trabajando actualmente.

- **Chat Participant (`ai-workspace`)**: Ejecuta prompts, agentes y skills guardados en tu espacio global directamente desde el chat de Copilot o las herramientas de IA integradas.

## 🛠️ Instalación y Configuración

1. Instala la extensión desde la Marketplace de VS Code.
2. Ve a la configuración de usuario (`Ctrl+,` o `Cmd+,`).
3. Busca **FhizxAITools: Global Path**.
4. Introduce la ruta absoluta donde deseas almacenar tus herramientas (ejemplo: `/Users/tu_usuario/Documents/AI_Tools`).

## 📖 Guía de Uso

### Navegación y Creación
En el panel lateral, podrás ver las secciones correspondientes a Prompts, Agents, Skills y Notes. Utiliza los botones en la barra superior o el menú contextual para:
- **Crear Archivo**: Añade una nueva entrada (prompt, agente, etc.).
- **Crear Carpeta**: Organiza tus recursos por categorías o proyectos específicos.

### Acciones Rápidas
Selecciona cualquier elemento en las vistas de Fhixx AI Tools y utiliza el menú contextual para:
- ✏️ **Modificar Nombre**
- 🗑️ **Eliminar**
- 📂 **Crear Contexto**: Crea rápidamente archivos o carpetas relacionadas.

### Uso del Chat Participant
Una vez configurado tu espacio global, puedes invocar al participante `ai-workspace` en el chat para ejecutar acciones basadas en la lógica que hayas definido previamente en tus prompts y habilidades guardadas.

## ⚙️ Configuración de Comandos

| Comando | Descripción | Icono |
| :--- | :--- | :--- |
| `fhizxAiTools.setGlobalPath` | Seleccionar Ruta Global | $(folder-opened) |
| `fhizxAiTools.createPromptFile` | Crear Prompt nuevo | $(file-add) |
| `fhizxAiTools.createAgentFile` | Crear Agente nuevo | $(file-add) |
| `fhizxAiTools.createSkillFile` | Crear Skill nueva | $(file-add) |
| `fhizxAiTools.createNoteFile` | Crear Nota nueva | $(file-add) |

---
*Desarrollado para potenciar el flujo de trabajo con IA en Visual Studio Code.*