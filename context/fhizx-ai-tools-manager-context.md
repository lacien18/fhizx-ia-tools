# Informe de Contexto: Fhizx AI Tools Manager (fhizx-ai-tools-manager)

Fecha de análisis: 2026-08-27
Versión analizada: 1.6.0
Tipo: Extensión de Visual Studio Code (TypeScript, CommonJS, target ES2022, VS Code API >= 1.85.0)

> Cambio arquitectónico mayor respecto al informe anterior (v1.4.2, 2026-08-04): las vistas de árbol (`TreeDataProvider`) por categoría, Configurations y Token Counter fueron reemplazadas por un **único webview** (`fhizxAiTools.mainView`) que renderiza toda la UI (acordeón de categorías + panel Utils con pestañas Tokens/Config/Dev). Ver sección 3 y 7 para el detalle del impacto.

---

## 1. Resumen Ejecutivo y Dominio de Negocio

### Propósito

**Fhizx AI Tools Manager** es una extensión de VS Code que centraliza, organiza y gestiona el ecosistema personal de herramientas de Inteligencia Artificial de un desarrollador directamente desde el editor. Resuelve el problema de dispersión de prompts, agents, skills, contextos y notas que normalmente se guardan en ubicaciones arbitrarias del disco, sin convenciones ni visibilidad.

El valor principal de la extensión se divide en cinco frentes:

1. **Espacio global personalizable**: define una ruta única (configuración `fhizxAiTools.globalPath`) que almacena las categorías `prompts`, `agents`, `skills`, `context` y `notes`, accesible desde cualquier proyecto.
2. **Integración con GitHub Copilot**: permite instalar y desinstalar recursos copiándolos a `~/.vscode/github-copilot/<categoria>/` (con conversión automática a `.prompt.md`) y registrándolos en `chat.promptFilesLocations`, de modo que Copilot los consuma como prompt files.
3. **Chat Participant `@fhizx-ai-tools`**: expone los recursos dentro del chat de Copilot mediante los comandos `usar <nombre>` (carga contenido recursivamente) y `listar [filtro]`.
4. **Panel único (webview) "FhizxAITools"**: reemplaza las antiguas vistas de árbol; un solo panel con secciones plegables por categoría, exportación a PDF, copia de seguridad en la nube (GitHub) y una sección "Utils" con contador de tokens, configuración y aprovisionamiento de un entorno de desarrollo (extensiones + estilo visual de VS Code).
5. **Auto-actualización**: la extensión revisa un repositorio de GitHub propio en cada activación y puede descargar e instalar el `.vsix` más reciente sin pasar por el Marketplace.

### Conceptos Clave

| Termino | Definicion |
| :--- | :--- |
| **Ruta Global** | Carpeta raiz definida en `fhizxAiTools.globalPath` donde viven las categorias de recursos. Sin ella la extension queda en estado de onboarding. |
| **Categoria** | Tipo de recurso gestionado: `prompts`, `agents`, `skills`, `context`, `notes`. Es la unidad de organizacion del espacio global. |
| **Categoria Copilot** | Subconjunto instalable en Copilot: `prompts`, `agents`, `skills`, `context` (se excluye `notes`). |
| **Recurso** | Archivo o carpeta dentro de una categoria. Los archivos usan extension `.prompt.md` salvo `notes`, que usa `.md`. |
| **Instalacion en Copilot** | Copia de un recurso a `~/.vscode/github-copilot/<categoria>/` con nombre normalizado a `.prompt.md` y registro en `chat.promptFilesLocations`. |
| **Prompt File** | Archivo de instrucciones que Copilot carga como prompt de archivo; se declara en `chat.promptFilesLocations`. |
| **Boilerplate** | Plantilla Markdown generada automaticamente al crear un archivo nuevo, especifica por categoria. |
| **Prefijo de nombre** | Convencion aplicada por categoria: `p-` (prompts), `a-` (agents), `s-` (skills), `c-` (context), sin prefijo en notes. |
| **WorkspaceItem** | Modelo de item usado como parametro tipado en los comandos (representa un archivo o carpeta). Desde el webview se construyen objetos planos con la misma forma (duck typing), ya no proviene de un `TreeDataProvider` registrado. |
| **Estado de instalacion** | Indicador por archivo: instalado (bullet lleno) o pendiente (bullet vacio); deriva de `InstallationService.isInstalled`. |
| **Webview Unificado** | `MainWebviewProvider` (`fhizxAiTools.mainView`), unica vista contribuida; renderiza HTML/CSS/JS propios (sin frameworks) y se comunica con la extension via `postMessage`. |
| **Seccion Acordeon** | Cada categoria (mas "utils") se renderiza como un bloque plegable, reordenable por drag-and-drop y con estado abierto/cerrado persistido en `globalState`. |
| **Panel Utils** | Bloque especial del acordeon con pestañas internas: Tokens, Config (incluye la subseccion Dev). |
| **Entorno de Desarrollo (Dev)** | Subseccion de Config que instala un set fijo de extensiones recomendadas (`DEVELOPMENT_EXTENSION_IDS`) y/o sobrescribe `settings.json` con un estilo visual predefinido (`DevelopmentEnvironmentService`). |

---

## 2. Casos de Uso y Actores

### Actores / Roles

| Actor | Interaccion |
| :--- | :--- |
| **Usuario Final (Desarrollador)** | Interactua con el panel unico (webview), su menu contextual HTML, comandos, QuickPicks, dialogs de entrada y el chat de Copilot. |
| **GitHub Copilot** | Destino de la instalacion de recursos (directorio `~/.vscode/github-copilot/`) y host del chat participant. |
| **GitHub (repo de releases propio)** | Origen de la auto-actualizacion (`checkForUpdates` consulta `lacien18/fhizx-ia-tools`, rama `main`, carpeta `src/versions/*.vsix`). |
| **GitHub (nube personal del usuario)** | Repositorio privado configurable (`cloud.owner`/`cloud.repo`) usado como backup remoto de la ruta global via `CloudSyncService`. |
| **Sistema de Archivos** | Fuente de verdad de los recursos (ruta global) y del directorio Copilot. |
| **Navegador del sistema** | Destino de `exportToPdf` (abre un HTML temporal con `window.print()` para "Guardar como PDF"). |
| **Eventos / Cron de VS Code** | `onStartupFinished` (activacion), `onDidChangeConfiguration` (refresco y reestructuracion), `onDidChangeActiveTextEditor` y `onDidChangeTextDocument` (panel de tokens), `FileSystemWatcher` sobre la ruta global (auto-sync a la nube). |

### Casos de Uso Principales (Happy Path)

- **UC-01 Configurar ruta global**: el usuario selecciona una carpeta con un dialog (`showOpenDialog`), se guarda en `fhizxAiTools.globalPath` (Global), se crea la estructura `prompts/agents/skills/context/notes` (`ensureGlobalStructure`) y se refresca el webview completo (`MainWebviewProvider.refresh()`).
- **UC-02 Explorar recursos**: al construir o refrescar el HTML, `buildFileTree` lee de forma sincrona y recursiva el directorio de cada categoria (`readdirSync`), filtra por extension valida, calcula estado de instalacion y devuelve un arbol ordenado (carpetas primero, luego alfabetico) que se renderiza como acordeon con subcarpetas colapsables en el cliente.
- **UC-03 Crear archivo con boilerplate**: se pide el nombre (`showInputBox`), se valida que no exista, se normaliza extension y prefijo, se escribe la plantilla (`getBoilerplateContent`) y se abre el archivo en el editor. Disparado desde los botones de cabecera de cada seccion del acordeon (`data-action="createFile"`).
- **UC-04 Crear carpeta**: idem, disparado desde el boton de cabecera de la seccion (`data-action="createFolder"`).
- **UC-05 Abrir archivo**: `showTextDocument` con el URI del recurso; disparado al hacer click en un item de tipo archivo dentro del panel.
- **UC-06 Renombrar elemento**: se pide el nuevo nombre preservando la extension, se valida colision y se ejecuta `renameSync`; disparado desde el menu contextual HTML del item (click derecho o boton "...").
- **UC-07 Eliminar elemento**: confirmacion modal, luego `rmSync` (recursivo si es carpeta) o `unlinkSync`.
- **UC-08 Copiar al portapapeles**: `safeReadFile` + `env.clipboard.writeText`, boton inline del item.
- **UC-09 Enviar al chat**: se abre el chat de Copilot con la query `Usa el siguiente recurso (<nombre>):\n\n<contenido>`; si el chat no soporta query, fallback a portapapeles.
- **UC-10 Instalar en Copilot**: copia el recurso a `~/.vscode/github-copilot/<categoria>/` con nombre normalizado a `.prompt.md` y registra el directorio en `chat.promptFilesLocations`.
- **UC-11 Desinstalar de Copilot**: elimina el archivo del directorio Copilot.
- **UC-12 Alternar instalacion (toggle)**: desde un item concreto del panel (menu contextual) o desde el boton "Instalar / Desinstalar en Copilot" de la pestaña Config, que abre un QuickPick con todos los recursos instalables y su estado.
- **UC-13 Chat participant `usar <nombre>`**: busqueda recursiva por nombre (con tolerancia a extension) en las cuatro categorias Copilot, lectura segura y renderizado en Markdown.
- **UC-14 Chat participant `listar [filtro]`**: listado por categoria de los archivos de primer nivel que coincidan con el filtro.
- **UC-15 Panel de Tokens**: estadisticas del archivo activo del editor por defecto (tokens exactos con `cl100k_base`, caracteres, palabras, lineas y costo estimado por cuatro modelos); incluye un selector con buscador que lista **todos** los `.md`/`.prompt.md` de la ruta global para fijar un archivo especifico distinto al activo (`selectFileForTokens` / `clearTokenFile`).
- **UC-16 Abrir ruta global en el sistema**: `revealFileInOS` (crea la ruta si no existe); boton en la pestaña Config.
- **UC-17 Buscar/instalar actualizaciones**: al activarse (y bajo demanda con "Buscar Actualizaciones"), consulta el repositorio GitHub `lacien18/fhizx-ia-tools`, ubica el `.vsix` mas reciente en `src/versions/` cuyo nombre matchee semver, compara con la version local y, si el usuario confirma, descarga el blob en base64, lo escribe en un archivo temporal y ejecuta `workbench.extensions.installExtension` con ese `.vsix` (instalacion directa, sin pasar por el Marketplace), ofreciendo recargar la ventana al finalizar.
- **UC-18 Activar / Desactivar auto-sync**: alterna `fhizxAiTools.cloud.autoSync` desde la pestaña Config; muestra notificacion con el nuevo estado y refresca el panel.
- **UC-19 Exportar a PDF**: `exportToPdf` convierte el Markdown a HTML (`markdown-it`), genera un archivo HTML temporal con boton "Guardar como PDF" y `window.print()` automatico al cargar, y lo abre con el navegador/visor externo del sistema (`env.openExternal`) para que el usuario use el dialogo nativo de impresion.
- **UC-20 Instalar extensiones de desarrollo**: desde la subseccion "Dev" de Config; `DevelopmentEnvironmentService.installExtensions()` muestra un QuickPick de seleccion multiple con el listado fijo `DEVELOPMENT_EXTENSION_IDS` (marcando las ya instaladas), boton "Instalar todo", e instala cada extension seleccionada no instalada via `workbench.extensions.installExtension`.
- **UC-21 Aplicar estilo de desarrollo**: confirmacion modal (sobrescribe `settings.json`) y luego `DevelopmentEnvironmentService.applyStyle()` aplica un set fijo de ajustes (tema, fuente, colores, formatters, etc.) con `workspace.getConfiguration().update(key, value, Global)`.
- **UC-22 Reordenar y plegar secciones del panel**: drag-and-drop entre secciones del acordeon (persistido en `globalState` bajo `fhizxAiTools.sectionOrder`) y toggle de apertura/cierre por seccion (persistido bajo `fhizxAiTools.sectionOpenState`); ambos sobreviven a recargas de la ventana.

### Casos de Uso Secundarios y Alternativos

- **Onboarding**: si no hay ruta global al activarse, se muestra un mensaje de bienvenida con accion directa a `setGlobalPath`.
- **Auto-registro de prompt files**: al activarse, la extension registra en `chat.promptFilesLocations` los directorios de categoria ya existentes en `~/.vscode/github-copilot/` (misma logica duplicada en `extension.ts` e `InstallationService`, ver deuda tecnica).
- **QuickPick de instalacion global**: `toggleInstall` sin nodo actua como selector de recursos en toda la ruta global (recorre `COPILOT_CATEGORIES` directamente con `fs.readdirSync`, sin pasar por `FileManagerService`).
- **Creacion contextual dentro de carpetas**: `createFileContext` / `createFolderContext` crean recursos dentro de la carpeta seleccionada, redirigiendo la categoria segun la ruta real (`getCategoryFromPath`); el webview construye un objeto `WorkspaceItem`-like a partir del `path` recibido en el mensaje.
- **Fallback de tokens**: si `js-tiktoken` falla, se estima `ceil(caracteres / 4)`.
- **Fallback de chat**: si `workbench.action.chat.open` no acepta query, se copia al portapapeles y se abre el chat vacio.
- **Errores de lectura silenciosos**: `safeReadFile` devuelve cadena vacia ante errores de lectura.
- **Actualizacion sin versiones nuevas**: si la version local es igual o mayor a la ultima publicada en el repo de releases, solo se informa que esta actualizado.

### Precondiciones y Postcondiciones

| Caso de Uso | Precondiciones | Postcondiciones |
| :--- | :--- | :--- |
| UC-01 (Configurar ruta) | Ninguna. | `fhizxAiTools.globalPath` persistida en Global; estructura de 5 carpetas creada; webview refrescado. |
| UC-02 (Explorar) | Ruta global configurada. | Acordeon renderizado con estado de instalacion por archivo. |
| UC-03/04 (Crear) | Ruta global configurada; nombre no existente. | Archivo/carpeta creados en la categoria; webview refrescado; archivo abierto en editor; push a la nube programado si hay servicio. |
| UC-06 (Renombrar) | Elemento seleccionado; nuevo nombre sin colision. | Elemento renombrado en disco; webview refrescado; push a la nube programado. |
| UC-07 (Eliminar) | Elemento seleccionado; confirmacion del usuario. | Elemento borrado del disco; webview refrescado; push a la nube programado. |
| UC-10/11 (Instalar/Desinstalar) | Archivo valido en categoria Copilot. | Archivo presente/ausente en `~/.vscode/github-copilot/<cat>/`; config `chat.promptFilesLocations` registrada; webview refrescado. |
| UC-13 (usar) | Ruta global configurada; recurso existente. | Contenido del recurso mostrado en el chat (o mensaje de no encontrado). |
| UC-14 (listar) | Ruta global configurada. | Listado Markdown por categoria en el chat. |
| UC-15 (Panel de tokens) | Archivo activo en el editor o archivo seleccionado del picker. | Estadisticas mostradas en el panel; se actualizan con cada cambio de documento o de editor activo. |
| UC-17 (Actualizar) | Extension activada; conectividad de red. | `.vsix` mas reciente instalado (si el usuario confirma) y ventana recargada. |
| UC-18 (Toggle auto-sync) | Nube conectada (opcional). | `fhizxAiTools.cloud.autoSync` alternado en Global; notificacion mostrada; watcher de nube reiniciado. |
| UC-19 (Exportar PDF) | Archivo Markdown valido. | Archivo HTML temporal generado y abierto en el navegador/visor externo con dialogo de impresion. |
| UC-20/21 (Dev extensiones/estilo) | Ninguna (VS Code con soporte de `workbench.extensions.installExtension`). | Extensiones instaladas y/o `settings.json` (Global) sobrescrito con el estilo predefinido. |
| UC-22 (Reordenar/plegar) | Ninguna. | Orden y estado de apertura persistidos en `globalState`; se respetan en la siguiente carga del panel. |

---

## 3. Arquitectura y Flujo de Datos

### Patron de Arquitectura

La extension sigue un patron **por capas con inyeccion de dependencias por constructor**, orientado a la API de extensiones de VS Code:

- **Capa de Presentacion (UI)**: `TreeDataProvider` (`WorkspaceTreeDataProvider`, `ConfigurationTreeDataProvider`, `TokenCounterTreeDataProvider`) y modelos `TreeItem` (`WorkspaceItem`, `ConfigurationItem`, `TokenStatItem`).
- **Capa de Aplicacion / Orquestacion**: `extension.ts` (composition root), `commandSubscriptions.ts` (registro de comandos) y `chatParticipantService.ts`.
- **Capa de Servicios de Dominio**: `FileManagerService` (CRUD de recursos, boilerplates, busqueda) e `InstallationService` (integración con Copilot).
- **Capa de Infraestructura / Utilidades**: `fsUtils.ts` (FS puro, testable), `resourceUtils.ts` (acoplado a la API de VS Code) y `cloudUtils.ts` (diff/collect de archivos, puro).
- **Capa de Configuracion / Constantes**: `src/constants/index.ts` centraliza IDs de comandos, prefijos, extensiones, precios de modelos y rutas.

No es Clean Architecture estricto, pero si una **arquitectura hexagonal ligera**: la logica pura (FS, diff de nube) esta aislada en `fsUtils`/`cloudUtils` (sin dependencias de VS Code) y el resto se comunica por contratos tipados (`CategoryProvider`, `FileManagerProviders`, `CategoryType`).

**Cambio clave (post v1.5.x):** ya no existen vistas de arbol registradas por categoria. `MainWebviewProvider` es la unica vista contribuida (`fhizxAiTools.mainView`, tipo `webview`) y genera todo el HTML/CSS/JS del panel en el proceso de extension; `WorkspaceTreeDataProvider` se mantiene como clase pero solo se instancia (sin `registerTreeDataProvider`) para reutilizar su metodo `getGlobalCategoryPath()` dentro de `FileManagerService`. `ConfigurationTreeDataProvider`, `TokenCounterTreeDataProvider` y sus modelos (`ConfigurationItem`, `TokenStatItem`) quedaron sin ninguna referencia activa (ver seccion 7, deuda tecnica).

### Flujo de la Informacion

**Flujo lectura (disco -> webview)**:

1. `MainWebviewProvider._getFullHtml()` (carga inicial) o `.refresh()` (recargas posteriores) leen `fhizxAiTools.globalPath` de la configuracion.
2. Por cada categoria en `CATEGORIES`, `buildFileTree` (`htmlGenerators.ts`) recorre el directorio recursivamente (`readdirSync`), filtra por extension valida y consulta `InstallationService.isInstalled` por archivo.
3. `renderCategoryPanel`/`renderConfigPanel`/`renderTokenPanel` transforman el arbol de datos en HTML como string (interpolacion directa, con `escapeHtml` para nombres/rutas).
4. El HTML resultante se inyecta en el documento del webview: en la carga inicial dentro de `_getFullHtml()`, y en refrescos posteriores via `webview.postMessage({ type: "update" | "updateAll", ... })`, que el script del cliente (`script.ts`) usa para reemplazar el `innerHTML` de los contenedores (`panel-<id>` / `tab-<id>`).

**Flujo escritura (accion del usuario en el webview -> comando -> disco -> refresco)**:

1. El script del cliente captura clicks/menu contextual/drag-drop y envia `vscode.postMessage({ type, path, category, ... })`.
2. `MainWebviewProvider._handleMessage` recibe el mensaje y, segun `type`, ejecuta un `vscode.commands.executeCommand(...)` pasando un objeto plano `{ resourceUri: Uri.file(path), isFolder, category, label }` que cumple estructuralmente el contrato de `WorkspaceItem` (duck typing, no es una instancia real).
3. El comando (registrado en `commandSubscriptions.ts`) usa `FileManagerService`/`InstallationService`/FS nativo para mutar el disco de forma sincrona.
4. El comando llama `refreshAll()` (invoca `mainWebview.refresh()`), que reconstruye todos los paneles y los envia con `postMessage({ type: "updateAll", panels })`.
5. Operaciones CRUD (crear, renombrar, eliminar) tambien llaman `cloudService.scheduleExplicitPush()` para programar una subida a la nube si esta configurada.

**Flujo instalacion en Copilot**: sin cambios respecto a versiones previas.

1. `InstallationService.installItem` copia el recurso con nombre normalizado (`toPromptFileName`) a `~/.vscode/github-copilot/<cat>/`.
2. `updateCopilotConfig` agrega el directorio a `chat.promptFilesLocations` (Global) si falta.
3. Al activarse, `ensureCopilotPromptConfig` (en `extension.ts`, logica duplicada respecto a `updateCopilotConfig`) hace lo mismo con directorios ya existentes.
4. El webview refleja el nuevo estado via `refreshAll`.

**Flujo pull desde la nube (pullFromCloud)**: sin cambios respecto a versiones previas (Git Trees + Blobs API, `diffLocalVsRemote` para borrar archivos `localOnly`, descargas individuales con try-catch).

**Flujo chat participant**: sin cambios (`usar <nombre>` / `listar [filtro]`, `findFileRecursive` + `safeReadFile`).

**Flujo de auto-actualizacion (`checkForUpdates`)**:

1. Consulta `GET /repos/lacien18/fhizx-ia-tools/branches/main` para el SHA del arbol raiz.
2. Consulta el arbol recursivo (`/git/trees/{sha}?recursive=1`), filtra blobs bajo `src/versions/` con patron `fhizx-ai-tools-manager-<semver>.vsix`.
3. Ordena por semver (`compareVersions`) y compara la mas reciente con `context.extension.packageJSON.version`.
4. Si hay una version mas nueva y el usuario confirma, descarga el blob (`/git/blobs/{sha}`, base64), lo escribe en un archivo temporal (`os.tmpdir()`) y llama `workbench.extensions.installExtension` con la `Uri` local del `.vsix`.
5. Ofrece recargar la ventana (`workbench.action.reloadWindow`) para activar la nueva version.

### Manejo de Estado

- **Sin estado reactivo compartido en el proceso de extension**: la "fuente de verdad" de recursos sigue siendo el sistema de archivos; el webview no mantiene cache propio, siempre reconstruye HTML desde disco al refrescar.
- **Estado de UI persistido en `globalState`**: `fhizxAiTools.sectionOrder` (orden de las secciones del acordeon, actualizado por drag-and-drop) y `fhizxAiTools.sectionOpenState` (abierto/cerrado por seccion, default abierto). Ambos sobreviven a recargas de ventana.
- **Estado efimero en memoria del provider**: `MainWebviewProvider._selectedTokenFile` (archivo fijado manualmente en el panel de Tokens); se pierde si se recarga la ventana (no persistido).
- **Refresco basado en `postMessage`**: no hay `EventEmitter`/`onDidChangeTreeData`; el "refresco" es literalmente reconstruir HTML en el extension host y enviarlo al webview.
- **Reaccion a configuracion**: `onDidChangeConfiguration` (namespace `fhizxAiTools`) dispara `this.refresh()` en el webview.
- **Reaccion al editor**: `onDidChangeActiveTextEditor` y `onDidChangeTextDocument` refrescan solo el panel de Tokens (`_updateTokenPanel`), no todo el webview.
- **Estado del lado del cliente (webview)**: `vscode.getState()/setState()` guarda el orden de secciones en el propio DOM del webview para restaurarlo tras un reload sin esperar el mensaje del extension host.

---

## 4. Componentes Clave y Mapa de Responsabilidades

### Modulos / Clases Principales

| Componente | Archivo | Responsabilidad (SRP) |
| :--- | :--- | :--- |
| `activate()` | `src/extension.ts` | Composition root: construye `CloudSyncService`, providers de categoria (para resolucion de rutas), `MainWebviewProvider`, `FileManagerService`, chat participant, comandos y manejo de configuracion/auto-sync inicial. |
| `MainWebviewProvider` | `src/webview/mainWebviewProvider.ts` | Unica vista de la extension (`fhizxAiTools.mainView`). Construye el HTML completo del panel, gestiona mensajes del cliente (`_handleMessage`), refresca paneles (`refresh`), persiste orden/estado de secciones y el archivo fijado para el contador de tokens. |
| `htmlGenerators` | `src/webview/htmlGenerators.ts` | Funciones puras de render: `buildFileTree` (arbol de archivos + estado de instalacion), `renderCategoryPanel`, `renderConfigPanel`, `renderDevPanel`, `renderTokenPanel`. |
| `script` (`getScript`) | `src/webview/script.ts` | JS que corre dentro del webview: tabs, acordeon, expandir/colapsar carpetas, menu contextual HTML, drag-and-drop de secciones, mensajeria hacia la extension. |
| `styles` (`getStyles`) | `src/webview/styles.ts` | CSS-in-JS del panel (acordeon, items, badges, tarjetas de config, tabs, menu contextual). |
| `WorkspaceTreeDataProvider` | `src/providers/workspaceTreeDataProvider.ts` | Ya no se registra como vista; se instancia solo para exponer `getGlobalCategoryPath()` a `FileManagerService` (contrato `CategoryProvider`). |
| `ConfigurationTreeDataProvider` / `TokenCounterTreeDataProvider` | `src/providers/*.ts` | **Codigo muerto**: no se instancian ni registran desde `extension.ts`; su funcionalidad fue absorbida por `MainWebviewProvider` + `htmlGenerators`. |
| `WorkspaceItem` | `src/models/workspaceItemModel.ts` | Modelo (antes `TreeItem`) usado como tipo de parametro en los comandos; el webview construye objetos planos con la misma forma en lugar de instanciarlo. |
| `ConfigurationItem` / `TokenStatItem` | `src/models/*.ts` | **Codigo muerto**, sin referencias activas fuera de si mismos. |
| `FileManagerService` | `src/services/fileManagerService.ts` | CRUD de archivos/carpetas, generacion de boilerplates por categoria, busqueda recursiva y resolucion de categoria desde una ruta. |
| `InstallationService` | `src/services/installationService.ts` | Instalacion/desinstalacion/toggle de recursos en Copilot y registro en `chat.promptFilesLocations` (metodos estaticos). |
| `CloudSyncService` | `src/services/cloudSyncService.ts` | Conectar/desconectar nube (GitHub), push (snapshot completo via Git Data API), pull (Trees+Blobs), auto-sync con `FileSystemWatcher` + debounce, `scheduleExplicitPush`. |
| `pdfExportService` (`exportToPdf`) | `src/services/pdfExportService.ts` | Convierte Markdown a HTML (`markdown-it`), genera un HTML imprimible temporal y lo abre externamente para "Guardar como PDF". |
| `DevelopmentEnvironmentService` | `src/services/developmentEnvironmentService.ts` | `installExtensions()` (QuickPick multi-seleccion sobre `DEVELOPMENT_EXTENSION_IDS`) y `applyStyle()` (sobrescribe `settings.json` Global con un set fijo de ajustes). |
| `registerChatParticipant` | `src/services/chatParticipantService.ts` | Registra el chat participant `@fhizx-ai-tools` con los subcomandos `usar` y `listar`. |
| `registerCommands` | `src/subscriptions/commandSubscriptions.ts` | Registra todos los comandos de la extension, incluida la auto-actualizacion (descarga e instala `.vsix` desde un repo GitHub propio) y los comandos de nube/dev. |
| `fsUtils` | `src/utils/fsUtils.ts` | Utilidades puras de FS sin dependencias de VS Code: `fileExists`, `isDirectory`, `safeReadFile`, `deletePath`, `toPromptFileName`. |
| `resourceUtils` | `src/utils/resourceUtils.ts` | Utilidades con API de VS Code: `getGlobalPathConfig`, `ensureGlobalStructure`, `resolveResourceFilePath`, `notifyFsError`. |
| `cloudUtils` | `src/utils/cloudUtils.ts` | `collectLocalFiles`, `diffLocalVsRemote`, `toPosixRelativePath`; puras y testeadas (`test/cloudUtils.test.ts`). |
| `constants` | `src/constants/index.ts` | Centraliza constantes, tipos derivados (`CategoryType`) y helpers (`capitalizeCategory`). Aun conserva `VIEW_IDS` para las cinco categorias + `TOKEN_COUNTER`/`CONFIGURATIONS`, que ya no se usan como IDs de vista real. |

### Dependencias Criticas

| Dependencia | Uso | Criticidad |
| :--- | :--- | :--- |
| **VS Code API** (`vscode`) | Webview, comandos, configuracion, chat participant, dialogs, clipboard, notificaciones, `globalState`, `secrets`. | Alta; sin ella no hay extension. |
| **`js-tiktoken`** | Encoder `cl100k_base` para conteo exacto de tokens en el panel Tokens. | Media; hay fallback por caracteres. |
| **`markdown-it`** | Renderizado de Markdown a HTML para la exportacion a PDF. | Media; sin ella no funciona `exportToPdf`. |
| **Node.js FS** (`fs`, `path`, `os`) | Operaciones sincronas sobre el disco y resolucion de rutas. | Alta. |
| **Node `https`** | Cliente HTTP minimo para la API de GitHub: `checkForUpdates` (repo propio de releases) y `CloudSyncService` (backup del usuario). | Alta para nube/auto-update; sin red, fallan con mensaje. |
| **Configuracion `chat.promptFilesLocations`** | Declara los directorios de prompt files para Copilot. | Alta para la integracion con Copilot. |
| **Directorio `~/.vscode/github-copilot/`** | Destino de instalacion de recursos. | Alta para la integracion con Copilot. |
| **Repo GitHub `lacien18/fhizx-ia-tools`** | Fuente de los `.vsix` de auto-actualizacion (hardcodeado en `commandSubscriptions.ts`). | Alta para el flujo de auto-update; riesgo de cadena de suministro si el repo es comprometido (ver seccion 7). |
| **`context.secrets` (SecretStorage)** | Almacena el Personal Access Token de GitHub para la nube personal. | Alta para la seguridad de la integracion de nube. |

---

## 5. Puntos de Extension (Extension Points)

### Puntos de Acople

| Que se quiere extender | Donde insertar codigo |
| :--- | :--- |
| **Nueva categoria de recurso** | 1) `src/constants/index.ts`: agregar a `CATEGORIES`, `FILE_PREFIXES`, `COPILOT_CATEGORIES` si es instalable. 2) `src/webview/mainWebviewProvider.ts`: agregar el id al arreglo `DEFAULT_SECTION_ORDER` para que aparezca por defecto en el acordeon. 3) `src/services/fileManagerService.ts`: `getBoilerplateContent` (CATEGORIES ya es dinamico en el resto). 4) `src/subscriptions/commandSubscriptions.ts`: los comandos dinamicos `create<Cat>File/Folder` se generan solos a partir de `CATEGORIES`. No se toca `package.json` (ya no hay vistas por categoria). |
| **Nuevo comando** | 1) `src/constants/index.ts`: clave en `COMMANDS`. 2) `src/subscriptions/commandSubscriptions.ts`: `registerCommand`. 3) Si debe dispararse desde el panel, agregar el `case` correspondiente en `MainWebviewProvider._handleMessage` y el `data-action`/boton en `htmlGenerators.ts` o `script.ts`. 4) `package.json`: `contributes.commands` (y `menus` solo si aplica a `editor/context`). |
| **Nueva accion/tarjeta en el panel Config** | `src/webview/htmlGenerators.ts` (`renderConfigPanel`/`renderDevPanel`): agregar el bloque HTML con `data-action`; manejar el nuevo `case` en `_handleMessage`. |
| **Nuevo subcomando del chat participant** | `src/services/chatParticipantService.ts`: agregar rama de regex antes del fallback de ayuda. |
| **Nuevo modelo de precio / token** | `src/constants/index.ts`: `MODEL_PRICES`; `src/webview/mainWebviewProvider.ts` (`_buildTokenHtml`): calcular el costo y agregarlo al arreglo `costs`. |
| **Nuevo boilerplate** | `src/services/fileManagerService.ts`: `getBoilerplateContent` (switch por categoria). |
| **Nueva extension/ajuste de VS Code recomendado (Dev)** | `src/services/developmentEnvironmentService.ts`: agregar el id a `DEVELOPMENT_EXTENSION_IDS` o la clave/valor a los settings aplicados en `applyStyle()`. |
| **Nuevo origen de "instalar" en Copilot** | `src/services/installationService.ts` (logica) + `commandSubscriptions.ts` (disparadores). |
| **Nueva accion de nube** | `src/services/cloudSyncService.ts` (logica) + comando en `commandSubscriptions.ts` + tarjeta/boton en `renderConfigPanel`. |

### Contratos / Interfaces

- **`CategoryProvider`** (`fileManagerService.ts`): contrato minimo `getGlobalCategoryPath(): string | undefined`; usado por `FileManagerService` para resolver rutas de categoria (implementado hoy por `WorkspaceTreeDataProvider`, aunque ya no funcione como vista).
- **`FileManagerProviders`**: `Record<CategoryType, CategoryProvider>`; exige que todos los providers de categoria implementen el contrato.
- **`CategoryType`**: union derivada de `CATEGORIES`; se importa desde `constants` y NO debe redefinirse en otros archivos.
- **Protocolo de mensajes webview <-> extension**: mensajes salientes del cliente tienen forma `{ type: string, path?: string, category?: string, ... }` (ver switch completo en `_handleMessage`); mensajes entrantes al cliente son `{ type: "update", panel, html }` o `{ type: "updateAll", panels }`. Agregar un nuevo tipo de mensaje implica tocar ambos lados (`script.ts` y `mainWebviewProvider.ts`).
- **`contextValue`/forma de `WorkspaceItem`**: los comandos siguen tipando su parametro como `WorkspaceItem`, pero en la practica reciben objetos planos `{ resourceUri, isFolder, category, label }` construidos por el webview; cualquier cambio en la forma del constructor de `WorkspaceItem` debe reflejarse tambien en `_handleMessage`.
- **`InstallationService`**: API estatica `getCopilotGlobalPath`, `isInstalled`, `installItem`, `uninstallItem`, `toggleItem`.
- **`COMMANDS`**: todos los IDs de comando deben existir en `package.json` o VS Code no los resuelve.
- **`FileEntry`** (`htmlGenerators.ts`): forma del arbol de archivos (`name`, `path`, `isFolder`, `isInstalled`, `children?`) usado por `buildFileTree`/`renderCategoryPanel`; independiente de `WorkspaceItem`.

---

## 6. Guia de Implementacion Futura (Checklist)

### Paso a Paso

1. **Definir el alcance**: identificar si el cambio es nueva categoria, comando, accion de panel, subcomando de chat o logica de instalacion/nube.
2. **Actualizar constantes primero**: agregar IDs, prefijos, extensiones o precios en `src/constants/index.ts` y exportar tipos derivados si aplica.
3. **Implementar la logica pura**: si involucra FS o diffs, agregar funciones en `src/utils/fsUtils.ts` o `src/utils/cloudUtils.ts` (sin dependencias de VS Code) para poder testearlas.
4. **Agregar/extender el servicio**: `FileManagerService`, `InstallationService`, `CloudSyncService`, `DevelopmentEnvironmentService` o `pdfExportService` segun el dominio.
5. **Conectar el comando**: registrar en `src/subscriptions/commandSubscriptions.ts` y declarar en `package.json` (`contributes.commands`).
6. **Conectar la UI del panel** (si aplica): agregar el HTML en `src/webview/htmlGenerators.ts`, el manejo de click/mensaje en `src/webview/script.ts`, y el `case` correspondiente en `MainWebviewProvider._handleMessage`.
7. **Registrar en el composition root**: instanciar/conectar en `src/extension.ts` si el nuevo componente necesita construirse en `activate()`.
8. **Agregar tests**: en `test/*.test.ts` con vitest (patron Arrange/Act/Assert) para toda logica pura nueva.
9. **Validar**: `npm run compile`, `npm test`, empaquetar con `vsce package --out src/versions/<nombre>-<version>.vsix` e instalar con la CLI completa de VS Code (la extension se prueba instalada, no con F5).
10. **Actualizar README y version**: documentar nuevos comandos y subir `version` en `package.json` (y publicar el `.vsix` en `src/versions/` si se quiere que `checkForUpdates` lo detecte).

### Convenciones y Estandares

- **Naming de comandos**: prefijo `fhizxAiTools.`; verbos en infinitivo (`create`, `rename`, `delete`, `install`, `toggle`, `open`, `send`, `copy`, `export`, `cloud*`).
- **Comandos dinamicos**: `fhizxAiTools.create<Category>File|Folder` generados con `COMMAND_PREFIX` + `capitalizeCategory`; mantener el patron al agregar categorias.
- **Constantes**: todo valor repetido vive en `src/constants/index.ts`; no duplicar strings magicos en services ni en el webview.
- **Tipos derivados**: exportar tipos (`CategoryType`) desde `constants` y no redefinirlos.
- **Estructura de carpetas**: `src/providers/` (parcialmente en desuso, ver deuda tecnica), `src/services/` (dominio), `src/models/` (modelos), `src/subscriptions/` (comandos), `src/utils/` (utilidades), `src/webview/` (UI unica: provider + generadores HTML + script cliente + estilos), `src/constants/`, `test/`.
- **Extension de archivos**: recursos instalables `.prompt.md`; notes `.md`; conversion con `toPromptFileName`.
- **Prefijos de categoria**: `p-`, `a-`, `s-`, `c-` y sin prefijo para notes.
- **HTML del webview**: se genera con template strings interpolados (no hay motor de plantillas); todo texto dinamico proveniente del sistema de archivos debe pasar por `escapeHtml` antes de interpolarse.
- **Idioma**: mensajes de usuario en espanol; codigo y comentarios en ingles donde sea idiomático; tests con Given/When/Then en ingles.
- **Tests**: vitest ^2 (vitest 4 no resuelve con `@types/node` 18); `npm test` = `vitest run`.

### Manejo de Errores

- **Contrato obligatorio**: operaciones FS mutantes (crear, renombrar, eliminar, abrir ruta, configurar) se envuelven en `try/catch` y usan `notifyFsError(accion, error)` (`resourceUtils.ts`) que loguea en consola y muestra `showErrorMessage`.
- **Lecturas seguras**: `safeReadFile` nunca lanza; devuelve `""` y loguea.
- **Predicados seguros**: `isDirectory` y `fileExists` no lanzan ante rutas inexistentes.
- **Fallos no criticos**: la actualizacion de `chat.promptFilesLocations` falla silenciosamente (`console.warn`); las solicitudes a la API de GitHub para actualizaciones (`ghRequest`) resuelven `undefined` en caso de error en vez de rechazar.
- **Precondiciones de UI**: antes de mutar, verificar ruta global configurada (`showWarningMessage` si falta) y existencia de destino.
- **Validaciones de negocio**: no sobrescribir archivos/carpetas existentes; bloquear renombrado con colision; confirmacion modal antes de eliminar, desconectar la nube o sobrescribir `settings.json` con el estilo Dev.
- **Chat participant**: ante falta de ruta global o recurso inexistente se responde con mensaje Markdown en el propio chat (no excepciones).
- **Nube**: errores de red o HTTP en `CloudSyncService` se propagan como `Error` con `statusCode`; los comandos los capturan y usan `notifyFsError`; el auto-push silencioso solo muestra `showWarningMessage` (no interrumpe al usuario).

---

## 7. Riesgos, Casos Borde y Deuda Tecnica

### Casos Borde (Edge Cases)

- **Ruta global vacia o con espacios**: `getGlobalPathConfig` y `getGlobalCategoryPath` truncan/descartan rutas en blanco; el onboarding se re-muestra al activar.
- **Ruta global apuntando a un directorio inexistente**: `buildFileTree` devuelve listas vacias; `openGlobalPath` lo crea; `ensureGlobalStructure` lo reconstruye al activar o cambiar config.
- **Nombre de archivo con extension ya incluida**: al crear, se limpia la extension duplicada antes de aplicar prefijo.
- **Colision de nombres**: crear archivo/carpeta o renombrar con destino existente se bloquea con mensaje de error.
- **Instalacion de carpetas**: `installItem`, `uninstallItem` y `toggleItem` ignoran carpetas (return temprano).
- **Notes no instalable**: la categoria `notes` no aparece en `COPILOT_CATEGORIES`; el menu contextual HTML del webview oculta las acciones de instalar/desinstalar cuando `category === "notes"`.
- **Nombre con extensiones compuestas**: `toPromptFileName` maneja `.prompt.md`, `.instructions.md`, `.md` y sin extension.
- **Busqueda en chat por nombre parcial**: `findFileRecursive` tolera buscar sin extension; un nombre que exista como `.md` y como `.prompt.md` resuelve el primero encontrado (orden de `readdirSync`, no determinista por categoria).
- **Archivos sin editor activo ni seleccion en el picker**: el panel de Tokens muestra un placeholder ("Selecciona un archivo o abre uno en el editor").
- **Archivo fijado para tokens eliminado o movido**: `_buildTokenHtml` valida `fs.existsSync(this._selectedTokenFile)` antes de leerlo; si ya no existe, cae de vuelta al editor activo.
- **Encoder de tokens fallido**: `js-tiktoken` puede lanzar con textos invalidos; se estima con caracteres/4.
- **Webview no visible / layout corrupto**: al ser una unica vista `webview` (no varias `TreeView`), el riesgo de "vista invisible por `viewLocations` corrupto" documentado en versiones previas se reduce, pero sigue existiendo a nivel de contenedor (`fhizx-ai-tools-container`); `Developer: Reset View Locations` sigue siendo el fix conocido.
- **Auto-actualizacion sin conectividad**: `checkForUpdates` falla silenciosamente con `showWarningMessage`/`notifyFsError` si la API de GitHub no responde o el repo/rama no existen.
- **Chat sin soporte de query**: `sendToChat` cae a portapapeles + chat vacio.
- **Multiples archivos con mismo nombre en subcarpetas**: `listar` solo muestra primer nivel; `usar` busca recursivo y toma el primero que encuentra.
- **Reordenamiento de secciones con id inexistente**: `sectionMap[id]` se filtra antes de renderizar (`order.filter((id) => sectionMap[id])`), por lo que un id persistido invalido (por ejemplo, de una categoria eliminada de `CATEGORIES`) simplemente se omite sin error.

### Atencion Especial

- **Rendimiento (FS sincrono)**: todas las operaciones de disco son sincronas (`readdirSync`, `writeFileSync`, `copyFileSync`, `statSync`) sobre el hilo principal de la extension; con miles de archivos, `buildFileTree` recorre todo el arbol en cada refresco completo del webview (no hay cache ni paginacion), lo que puede bloquear la UI.
- **Recursion**: `findFileRecursive` y `buildFileTree` son recursivos sin limite de profundidad; rutas muy profundas o ciclos simbolicos (symlinks) podrian causar recursion excesiva.
- **Seguridad (path traversal)**: los nombres de archivo/carpeta introducidos por el usuario se interpolan directamente en rutas (`path.join`) sin sanitizar separadores (`../`); hoy el input llega desde `showInputBox` (usuario local), pero el webview tambien reenvia como comando cualquier `path` que el propio HTML generado por la extension incluya en `data-path` — si ese HTML llegara a incluir datos no confiables (por ejemplo, nombres de archivo sincronizados desde la nube de otro usuario) podria abrir o borrar rutas inesperadas. Conviene validar que `path` este siempre dentro de `globalPath` antes de ejecutar comandos destructivos.
- **CSP del webview**: la politica declarada (`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'`) permite estilos y scripts inline porque el HTML se genera dinamicamente en el extension host; no carga recursos remotos ni scripts externos, lo que mitiga XSS clasico, pero cualquier dato no escapado (nombres de archivo) que se interpole en el HTML podria inyectar markup si `escapeHtml` se omite en un punto nuevo.
- **Auto-actualizacion desde repositorio de terceros (cadena de suministro)**: `checkForUpdates` descarga un `.vsix` desde un repositorio GitHub publico hardcodeado (`lacien18/fhizx-ia-tools`) y lo instala directamente con `workbench.extensions.installExtension`, sin verificar checksum ni firma mas alla de la comparacion de nombre/semver. Si esa cuenta u repositorio fuera comprometido, un `.vsix` malicioso se instalaria con la confirmacion del usuario ("Instalar ahora"); es un vector de riesgo real y deberia documentarse claramente al usuario y, de ser posible, verificar integridad (hash conocido o firma) antes de instalar.
- **Sobrescritura de configuracion del usuario**: `installDevStyle` reemplaza claves de `settings.json` (Global) con valores hardcodeados en el codigo fuente (tema, colores, rutas de SDK de Flutter especificas de una maquina, lista de palabras de `cSpell`, etc.); aunque pide confirmacion modal, es una operacion agresiva y no reversible automaticamente (no guarda backup de los valores previos).
- **Persistencia de configuracion**: `chat.promptFilesLocations` se actualiza con `ConfigurationTarget.Global`; depende de que el setting exista en la version de VS Code (se ignora silenciosamente si no).
- **Integracion con Copilot**: la extension asume la ruta `~/.vscode/github-copilot/`; cambios de Copilot en su layout interno romperian la instalacion.
- **Sincronizacion de datos**: la extension usa un `FileSystemWatcher` sobre la ruta global y ademas invoca `scheduleExplicitPush()` tras cada operacion CRUD (crear, renombrar, eliminar archivo/carpeta), independientemente de si auto-sync esta activado. Cuando auto-sync esta activado, los cambios detectados por el watcher tambien se suben automaticamente tras un debounce de 1,5 s. Carpetas vacias se sincronizan mediante un `.gitkeep` virtual generado por `collectLocalFiles`.
- **Token de GitHub en `SecretStorage`**: el PAT de la nube personal se guarda cifrado via `context.secrets`, correctamente separado de la configuracion en texto plano (`cloud.owner`/`cloud.repo` si son publicos, pero el token no).
- **Push como snapshot completo**: cada push crea un arbol git sin `base_tree`, de modo que el repositorio remoto es un espejo exacto del estado local. Archivos eliminados localmente desaparecen del remoto en el siguiente push. El primer push a un repo vacio crea la referencia de la rama con `POST /git/refs`; pushes subsecuentes actualizan la ref con `force: true`.
- **Pull desde la nube**: la descarga de blobs usa la respuesta JSON (base64) en lugar de `Accept: application/vnd.github.raw`, ya que el media type raw puede no devolver contenido correctamente en todos los escenarios. Cada blob se descarga con try-catch individual para tolerar fallos parciales sin abortar la operacion completa.

### Deuda Tecnica Identificada

- **Codigo muerto (providers/modelos de arbol)**: `src/providers/configurationTreeDataProvider.ts`, `src/providers/tokenCounterProvider.ts`, `src/models/configurationItemModel.ts` y `src/models/tokenStatItemModel.ts` ya no se usan tras la migracion al webview unico; candidatos a eliminar (o a documentar explicitamente como legado si se piensa volver a vistas nativas).
- **`WorkspaceTreeDataProvider` con doble proposito ambiguo**: la clase sigue implementando `vscode.TreeDataProvider` completo (incluye `onDidChangeTreeData`, `getTreeItem`) pero solo se usa por su metodo `getGlobalCategoryPath()`; podria reducirse a una funcion pura o a una clase mas pequeña dedicada solo a resolucion de rutas.
- **`VIEW_IDS` desactualizado**: `src/constants/index.ts` mantiene IDs de vistas (`PROMPTS`, `AGENTS`, ..., `TOKEN_COUNTER`, `CONFIGURATIONS`) que ya no corresponden a ninguna vista contribuida en `package.json` (solo existe `fhizxAiTools.mainView`).
- **FS sincrono generalizado**: migrar a APIs asincronas (`fs/promises`) en operaciones de escritura/lectura masivas, especialmente `buildFileTree` en arboles grandes.
- **Tests limitados**: `fsUtils` y `cloudUtils` tienen cobertura (`test/fsUtils.test.ts`, `test/cloudUtils.test.ts`); faltan tests para `FileManagerService`, `InstallationService`, `ChatParticipantService`, `htmlGenerators`, `MainWebviewProvider`, `CloudSyncService`, `DevelopmentEnvironmentService`, `pdfExportService` y comandos.
- **Precios de modelos hardcodeados** en `MODEL_PRICES`; deberian ser configurables o provenir de una fuente externa.
- **Encoder unico (`cl100k_base`)** para todos los modelos, aunque Claude/Gemini usan tokenizers distintos; los costos son aproximados.
- **Parsing del chat participant por regex**: fragil ante variaciones de idioma/espacios; considerar un parser mas robusto o comandos slash.
- **Duplicidad de logica de configuracion**: `ensureCopilotPromptConfig` (`extension.ts`) y `updateCopilotConfig` (`installationService.ts`) hacen lo mismo; consolidar.
- **Repositorio de auto-actualizacion hardcodeado en dos lugares implicitos**: `updateOwner`/`updateRepo` estan escritos como literales dentro del comando `CHECK_FOR_UPDATES`; deberian vivir en `constants/index.ts` junto al resto de configuracion de red.
- **Ajustes de `installDevStyle` acoplados a la maquina del autor**: incluye rutas absolutas (`dart.flutterSdkPath`) y preferencias muy personales (tema, atajos, `cSpell.userWords` con vocabulario de otros proyectos); poco reutilizable para otros usuarios sin editar el codigo fuente.
- **HTML generado con template strings y emojis como iconos**: mantenible pero fragil ante escapes faltantes; los emojis (`📄`, `📁`, `✨`, etc.) dependen del soporte de fuente del sistema operativo y no son accesibles como `ThemeIcon`.
- **Duck typing de `WorkspaceItem` sin validacion en runtime**: los objetos planos que arma `MainWebviewProvider._handleMessage` no se validan contra la forma real de la clase; un cambio en el constructor de `WorkspaceItem` no rompe la compilacion del lado del webview (son objetos literales, no instancias) y podria fallar silenciosamente en runtime.
- **Falta documentacion de arquitectura versionada**: este documento mitiga parcialmente; conviene regenerarlo con cada cambio estructural relevante (como se hizo en esta revision tras la migracion al webview unico).
- **`diffLocalVsRemote` con semantica ambigua**: la funcion retorna `toUpload` (local-only) y `toDelete` (remote-only); estos nombres tienen sentido para push pero son confusos en pull. El caller de pull ahora usa `toUpload` renombrado a `localOnly` para eliminar archivos locales obsoletos. Considerar renombrar la API a `localOnly` / `remoteOnly` para claridad.
