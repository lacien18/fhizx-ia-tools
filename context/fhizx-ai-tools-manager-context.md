# Informe de Contexto: Fhizx AI Tools Manager (fhizx-ai-tools-manager)

Fecha de análisis: 2026-08-04
Versión analizada: 1.4.2
Tipo: Extensión de Visual Studio Code (TypeScript, CommonJS, target ES2022, VS Code API >= 1.85.0)

---

## 1. Resumen Ejecutivo y Dominio de Negocio

### Propósito

**Fhizx AI Tools Manager** es una extensión de VS Code que centraliza, organiza y gestiona el ecosistema personal de herramientas de Inteligencia Artificial de un desarrollador directamente desde el editor. Resuelve el problema de dispersión de prompts, agents, skills, contextos y notas que normalmente se guardan en ubicaciones arbitrarias del disco, sin convenciones ni visibilidad.

El valor principal de la extensión se divide en tres frentes:

1. **Espacio global personalizable**: define una ruta única (configuración `fhizxAiTools.globalPath`) que almacena las categorías `prompts`, `agents`, `skills`, `context` y `notes`, accesible desde cualquier proyecto.
2. **Integración con GitHub Copilot**: permite instalar y desinstalar recursos copiándolos a `~/.vscode/github-copilot/<categoria>/` (con conversión automática a `.prompt.md`) y registrándolos en `chat.promptFilesLocations`, de modo que Copilot los consuma como prompt files.
3. **Chat Participant `@fhizx-ai-tools`**: expone los recursos dentro del chat de Copilot mediante los comandos `usar <nombre>` (carga contenido recursivamente) y `listar [filtro]`.

Adicionalmente incluye una vista de contador de tokens del archivo activo con estimación de costo por modelo.

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
| **WorkspaceItem** | Modelo de ítem de arbol que representa un archivo o carpeta del espacio global. |
| **Estado de instalacion** | Indicador por archivo: instalado (icono verde) o pendiente (icono rojo); deriva de `InstallationService.isInstalled`. |

---

## 2. Casos de Uso y Actores

### Actores / Roles

| Actor | Interaccion |
| :--- | :--- |
| **Usuario Final (Desarrollador)** | Interactua con las vistas del arbol, menus contextuales, comandos, QuickPicks, dialogs de entrada y el chat de Copilot. |
| **GitHub Copilot** | Destino de la instalacion de recursos (directorio `~/.vscode/github-copilot/`) y host del chat participant. |
| **VS Code Marketplace** | Origen de la verificacion de version (`checkForUpdates` via API `extensionquery`). |
| **Sistema de Archivos** | Fuente de verdad de los recursos (ruta global) y del directorio Copilot. |
| **Eventos / Cron de VS Code** | `onStartupFinished` (activacion), `onDidChangeConfiguration` (refresco y reestructuracion), `onDidChangeActiveTextEditor` y `onDidChangeTextDocument` (token counter), cambios en documentos de texto. |

### Casos de Uso Principales (Happy Path)

- **UC-01 Configurar ruta global**: el usuario selecciona una carpeta con un dialog (`showOpenDialog`), se guarda en `fhizxAiTools.globalPath` (Global), se crea la estructura `prompts/agents/skills/context/notes` (`ensureGlobalStructure`) y se refrescan todas las vistas.
- **UC-02 Explorar recursos**: cada vista lee de forma sincrona el directorio de su categoria (`readdirSync`), filtra por extension valida, calcula estado de instalacion y devuelve items ordenados (carpetas primero, luego alfabetico).
- **UC-03 Crear archivo con boilerplate**: se pide el nombre (`showInputBox`), se valida que no exista, se normaliza extension y prefijo, se escribe la plantilla (`getBoilerplateContent`) y se abre el archivo en el editor.
- **UC-04 Crear carpeta**: se pide el nombre, se valida existencia y se ejecuta `mkdirSync` recursivo.
- **UC-05 Abrir archivo**: `showTextDocument` con el URI del recurso.
- **UC-06 Renombrar elemento**: se pide el nuevo nombre preservando la extension, se valida colision y se ejecuta `renameSync`.
- **UC-07 Eliminar elemento**: confirmacion modal, luego `rmSync` (recursivo si es carpeta) o `unlinkSync`.
- **UC-08 Copiar al portapapeles**: `safeReadFile` + `env.clipboard.writeText`.
- **UC-09 Enviar al chat**: se abre el chat de Copilot con la query `Usa el siguiente recurso (<nombre>):\n\n<contenido>`; si el chat no soporta query, fallback a portapapeles.
- **UC-10 Instalar en Copilot**: copia el recurso a `~/.vscode/github-copilot/<categoria>/` con nombre normalizado a `.prompt.md` y registra el directorio en `chat.promptFilesLocations`.
- **UC-11 Desinstalar de Copilot**: elimina el archivo del directorio Copilot.
- **UC-12 Alternar instalacion (toggle)**: desde un nodo concreto o desde la vista Configurations con un QuickPick que lista todos los recursos instalables y su estado.
- **UC-13 Chat participant `usar <nombre>`**: busqueda recursiva por nombre (con tolerancia a extension) en las cuatro categorias Copilot, lectura segura y renderizado en Markdown.
- **UC-14 Chat participant `listar [filtro]`**: listado por categoria de los archivos de primer nivel que coincidan con el filtro.
- **UC-15 Token Counter**: estadisticas del archivo activo (tokens exactos con `cl100k_base`, caracteres, palabras, lineas y costo estimado por cuatro modelos).
- **UC-16 Abrir ruta global en el sistema**: `revealFileInOS` (crea la ruta si no existe).
- **UC-17 Buscar actualizaciones**: consulta la version publicada en Marketplace y ofrece abrir la pagina de la extension.
- **UC-18 Activar / Desactivar auto-sync**: alterna `fhizxAiTools.cloud.autoSync` desde la vista Configurations; muestra notificacion con el nuevo estado y refresca las vistas.

### Casos de Uso Secundarios y Alternativos

- **Onboarding**: si no hay ruta global al activarse, se muestra un mensaje de bienvenida con accion directa a `setGlobalPath`.
- **Auto-registro de prompt files**: al activarse, la extension registra en `chat.promptFilesLocations` los directorios de categoria ya existentes en `~/.vscode/github-copilot/`.
- **QuickPick de instalacion global**: `toggleInstall` sin nodo actua como selector de recursos en toda la ruta global.
- **Creacion contextual dentro de carpetas**: `createFileContext` / `createFolderContext` crean recursos dentro de la carpeta seleccionada, redirigiendo la categoria segun la ruta real (`getCategoryFromPath`).
- **Fallback de tokens**: si `js-tiktoken` falla, se estima `ceil(caracteres / 4)`.
- **Fallback de chat**: si `workbench.action.chat.open` no acepta query, se copia al portapapeles y se abre el chat vacio.
- **Errores de lectura silenciosos**: `safeReadFile` devuelve cadena vacia ante errores de lectura.

### Precondiciones y Postcondiciones

| Caso de Uso | Precondiciones | Postcondiciones |
| :--- | :--- | :--- |
| UC-01 (Configurar ruta) | Ninguna. | `fhizxAiTools.globalPath` persistida en Global; estructura de 5 carpetas creada; vistas refrescadas. |
| UC-02 (Explorar) | Ruta global configurada. | Arbol renderizado con estado de instalacion por archivo. |
| UC-03/04 (Crear) | Ruta global configurada; nombre no existente. | Archivo/carpeta creados en la categoria; vistas refrescadas; archivo abierto en editor. |
| UC-06 (Renombrar) | Elemento seleccionado; nuevo nombre sin colision. | Elemento renombrado en disco; vistas refrescadas. |
| UC-07 (Eliminar) | Elemento seleccionado; confirmacion del usuario. | Elemento borrado del disco; vistas refrescadas. |
| UC-10/11 (Instalar/Desinstalar) | Archivo valido en categoria Copilot. | Archivo presente/ausente en `~/.vscode/github-copilot/<cat>/`; config `chat.promptFilesLocations` registrada; vistas refrescadas. |
| UC-13 (usar) | Ruta global configurada; recurso existente. | Contenido del recurso mostrado en el chat (o mensaje de no encontrado). |
| UC-14 (listar) | Ruta global configurada. | Listado Markdown por categoria en el chat. |
| UC-15 (Token counter) | Archivo activo en el editor. | Estadisticas mostradas en la vista; se actualizan con cada cambio o cambio de editor activo. |
| UC-18 (Toggle auto-sync) | Nube conectada (opcional). | `fhizxAiTools.cloud.autoSync` alternado en Global; notificacion mostrada; vistas refrescadas. |

---

## 3. Arquitectura y Flujo de Datos

### Patron de Arquitectura

La extension sigue un patron **por capas con inyeccion de dependencias por constructor**, orientado a la API de extensiones de VS Code:

- **Capa de Presentacion (UI)**: `TreeDataProvider` (`WorkspaceTreeDataProvider`, `ConfigurationTreeDataProvider`, `TokenCounterTreeDataProvider`) y modelos `TreeItem` (`WorkspaceItem`, `ConfigurationItem`, `TokenStatItem`).
- **Capa de Aplicacion / Orquestacion**: `extension.ts` (composition root), `commandSubscriptions.ts` (registro de comandos) y `chatParticipantService.ts`.
- **Capa de Servicios de Dominio**: `FileManagerService` (CRUD de recursos, boilerplates, busqueda) e `InstallationService` (integración con Copilot).
- **Capa de Infraestructura / Utilidades**: `fsUtils.ts` (FS puro, testable) y `resourceUtils.ts` (acoplado a la API de VS Code).
- **Capa de Configuracion / Constantes**: `src/constants/index.ts` centraliza IDs de vistas, comandos, prefijos, extensiones, iconos, precios de modelos y rutas.

No es Clean Architecture estricto, pero si una **arquitectura hexagonal ligera**: la logica pura (FS) esta aislada en `fsUtils` (sin dependencias de VS Code) y el resto se comunica por contratos tipados (`CategoryProvider`, `FileManagerProviders`, `CategoryType`).

### Flujo de la Informacion

**Flujo lectura (UI -> disco)**:

1. VS Code invoca `getChildren()` del provider de la vista.
2. El provider lee `fhizxAiTools.globalPath` de la configuracion y resuelve `path.join(globalPath, category)`.
3. `fs.readdirSync` sobre el directorio; se filtran archivos por extension valida (`validateExtension`).
4. `InstallationService.isInstalled` consulta si existe el equivalente `.prompt.md` en el directorio Copilot.
5. Se construyen `WorkspaceItem` (iconos de estado verde/rojo) y se devuelven ordenados.

**Flujo escritura (accion del usuario -> disco -> UI)**:

1. Comando invocado desde menu, boton de titulo o chat.
2. `FileManagerService` (o `InstallationService`) muta el disco de forma sincrona.
3. Se invoca `refreshAll()` (o `provider.refresh()`), que dispara `_onDidChangeTreeData.fire()`.
4. VS Code re-llama `getChildren()` y la UI se actualiza.

**Flujo instalacion en Copilot**:

1. `InstallationService.installItem` copia el recurso con nombre normalizado (`toPromptFileName`) a `~/.vscode/github-copilot/<cat>/`.
2. `updateCopilotConfig` agrega el directorio a `chat.promptFilesLocations` (Global) si falta.
3. Al activarse, `ensureCopilotPromptConfig` hace lo mismo con directorios ya existentes.
4. La vista refleja el nuevo estado via `refreshAll`.

**Flujo pull desde la nube (pullFromCloud)**:

1. Se obtiene el arbol recursivo del repositorio remoto via API de GitHub (`/git/trees/{branch}?recursive=1`).
2. Se filtran solo blobs (archivos), excluyendo `.git/`.
3. Se comparan archivos locales vs remotos con `diffLocalVsRemote`; se identifica `localOnly` (archivos locales sin contraparte remota, candidatos a eliminar).
4. Se itera cada blob remoto: se crea el directorio padre (`mkdirSync`) y se descarga el contenido del blob via `/git/blobs/{sha}` (respuesta JSON con contenido base64), se decodifica y se escribe en disco.
5. Se eliminan archivos `localOnly` que ya no existen en el remoto.
6. Cada descarga individual esta envuelta en try-catch para que un fallo no aborte el resto.

**Flujo chat participant**:

1. El usuario escribe `@fhizx-ai-tools usar <nombre>` o `@fhizx-ai-tools listar`.
2. `chatParticipantService` parsea el prompt con expresiones regulares.
3. `usar` delega en `fileManager.findFileRecursive` (busqueda recursiva con tolerancia de extension) y `safeReadFile`.
4. `listar` lee el primer nivel de cada categoria Copilot y renderiza Markdown.
5. La respuesta se envia con `response.markdown(...)`.

### Manejo de Estado

- **Sin estado reactivo global**: no hay store ni estado compartido; la "fuente de verdad" es el sistema de archivos.
- **Refresco basado en eventos**: los providers exponen `onDidChangeTreeData` via `EventEmitter`; los comandos llaman `refreshAll()` despues de mutar disco.
- **Reaccion a configuracion**: `onDidChangeConfiguration` (namespace `fhizxAiTools`) refresca la vista de configuraciones y recrea la estructura global si cambio la ruta.
- **Reaccion al editor**: `onDidChangeActiveTextEditor` y `onDidChangeTextDocument` refrescan el token counter cuando el documento activo cambia o se edita.

---

## 4. Componentes Clave y Mapa de Responsabilidades

### Modulos / Clases Principales

| Componente | Archivo | Responsabilidad (SRP) |
| :--- | :--- | :--- |
| `activate()` | `src/extension.ts` | Composition root: construye providers y servicios, registra vistas, chat participant, comandos y manejo de configuracion inicial. |
| `WorkspaceTreeDataProvider` | `src/providers/workspaceTreeDataProvider.ts` | Renderiza el arbol de una categoria (`prompts`, `agents`, `skills`, `context`, `notes`), filtra extensiones, calcula estado de instalacion y resuelve la ruta de la categoria. |
| `ConfigurationTreeDataProvider` | `src/providers/configurationTreeDataProvider.ts` | Renderiza el centro de control: acciones, estado de la ruta global y acceso a comandos de configuracion. |
| `TokenCounterTreeDataProvider` | `src/providers/tokenCounterProvider.ts` | Calcula tokens, estadisticas del documento activo y costos estimados por modelo. |
| `WorkspaceItem` | `src/models/workspaceItemModel.ts` | Modelo TreeItem de archivo/carpeta con estado de instalacion, `contextValue` para menus y comando de apertura. |
| `ConfigurationItem` | `src/models/configurationItemModel.ts` | Modelo TreeItem de la vista Configurations; `contextValue` derivado de `kind` (`config_info`, `config_status`, `config_action`). |
| `TokenStatItem` | `src/models/tokenStatItemModel.ts` | Modelo TreeItem de estadistica del token counter. |
| `FileManagerService` | `src/services/fileManagerService.ts` | CRUD de archivos/carpetas, generacion de boilerplates por categoria, busqueda recursiva y resolucion de categoria desde una ruta. |
| `InstallationService` | `src/services/installationService.ts` | Instalacion/desinstalacion/toggle de recursos en Copilot y registro en `chat.promptFilesLocations` (metodos estaticos). |
| `registerChatParticipant` | `src/services/chatParticipantService.ts` | Registra el chat participant `@fhizx-ai-tools` con los subcomandos `usar` y `listar`. |
| `registerCommands` | `src/subscriptions/commandSubscriptions.ts` | Registra todos los comandos de la extension y la consulta de version en Marketplace. |
| `fsUtils` | `src/utils/fsUtils.ts` | Utilidades puras de FS sin dependencias de VS Code: `fileExists`, `isDirectory`, `safeReadFile`, `deletePath`, `toPromptFileName`. |
| `resourceUtils` | `src/utils/resourceUtils.ts` | Utilidades con API de VS Code: `getGlobalPathConfig`, `ensureGlobalStructure`, `resolveResourceFilePath`, `notifyFsError`. |
| `constants` | `src/constants/index.ts` | Centraliza constantes, tipos derivados (`CategoryType`) y helpers (`capitalizeCategory`). |

### Dependencias Criticas

| Dependencia | Uso | Criticidad |
| :--- | :--- | :--- |
| **VS Code API** (`vscode`) | Trees, comandos, configuracion, chat participant, dialogs, clipboard, notificaciones. | Alta; sin ella no hay extension. |
| **`js-tiktoken`** | Encoder `cl100k_base` para conteo exacto de tokens. | Media; hay fallback por caracteres. |
| **Node.js FS** (`fs`, `path`, `os`) | Operaciones sincronas sobre el disco y resolucion de rutas. | Alta. |
| **Node `https`** | Consulta a la API publica `extensionquery` de Marketplace para `checkForUpdates`. | Baja; falla silenciosamente. |
| **Configuracion `chat.promptFilesLocations`** | Declara los directorios de prompt files para Copilot. | Alta para la integracion con Copilot. |
| **Directorio `~/.vscode/github-copilot/`** | Destino de instalacion de recursos. | Alta para la integracion con Copilot. |
| **Marketplace (publisher `undefined_publisher`)** | Verificacion de version; la extension no esta publicada oficialmente. | Baja/Media. |

---

## 5. Puntos de Extension (Extension Points)

### Puntos de Acople

| Que se quiere extender | Donde insertar codigo |
| :--- | :--- |
| **Nueva categoria de recurso** | 1) `src/constants/index.ts`: agregar a `CATEGORIES`, `FILE_PREFIXES`, `COPILOT_CATEGORIES` si es instalable y `VIEW_IDS`. 2) `src/extension.ts`: instanciar `WorkspaceTreeDataProvider`, registrarla con `registerTreeDataProvider` y agregarla a `providers` y `refreshAll`. 3) `src/services/fileManagerService.ts`: `getBoilerplateContent` y `getCategoryFromPath` (CATEGORIES ya es dinamico). 4) `package.json`: nueva vista en `contributes.views`, botones `view/title` y menús `view/item/context`. |
| **Nuevo comando** | 1) `src/constants/index.ts`: clave en `COMMANDS`. 2) `src/subscriptions/commandSubscriptions.ts`: `registerCommand`. 3) `package.json`: `contributes.commands` y referencias en `menus`. |
| **Nueva vista (contenedor nuevo)** | 1) `src/constants/index.ts`: `VIEW_IDS`. 2) Crear provider en `src/providers/`. 3) `src/extension.ts`: instanciar y registrar. 4) `package.json`: vista y menus. |
| **Nuevo subcomando del chat participant** | `src/services/chatParticipantService.ts`: agregar rama de regex antes del fallback de ayuda. |
| **Nuevo modelo de precio / token** | `src/constants/index.ts`: `MODEL_PRICES`; `src/providers/tokenCounterProvider.ts`: calcular y agregar `TokenStatItem`. |
| **Nuevo boilerplate** | `src/services/fileManagerService.ts`: `getBoilerplateContent` (switch por categoria). |
| **Nueva accion en Configurations** | `src/providers/configurationTreeDataProvider.ts`: agregar `ConfigurationItem` con `kind: info` y comando; ajustar menus en `package.json` si requiere `contextValue` nuevo. |
| **Nuevo origen de "instalar"** | `src/services/installationService.ts` (logica) + `commandSubscriptions.ts` (disparadores). |

### Contratos / Interfaces

- **`CategoryProvider`** (`fileManagerService.ts`): contrato minimo `getGlobalCategoryPath(): string | undefined`; usado por `FileManagerService` para resolver rutas de categoria.
- **`FileManagerProviders`**: `Record<CategoryType, CategoryProvider>`; exige que todos los providers de categoria implementen el contrato.
- **`CategoryType`**: union derivada de `CATEGORIES`; se importa desde `constants` y NO debe redefinirse en otros archivos.
- **`vscode.TreeDataProvider<T>`**: implementado por los tres providers (`getTreeItem`, `getChildren`, `onDidChangeTreeData`, `refresh`).
- **`contextValue` de los modelos**: `WorkspaceItem` usa `file_installed`, `file_uninstalled`, `folder`; `ConfigurationItem` usa `config_info`, `config_status`, `config_action`; `TokenStatItem` usa `tokenStat`. Los menus de `package.json` dependen de estos valores (cambiar uno rompe los menus).
- **`WorkspaceItem` constructor**: firma fija `(label, resourceUri, collapsibleState, isFolder, category, isInstalled)`; los callers (providers, QuickPick de toggle) dependen de ella.
- **`InstallationService`**: API estatica `getCopilotGlobalPath`, `isInstalled`, `installItem`, `uninstallItem`, `toggleItem`.
- **`COMMANDS`**: todos los IDs de comando deben existir en `package.json` o VS Code no los resuelve.

---

## 6. Guia de Implementacion Futura (Checklist)

### Paso a Paso

1. **Definir el alcance**: identificar si el cambio es nueva categoria, comando, vista, subcomando de chat o logica de instalacion.
2. **Actualizar constantes primero**: agregar IDs, prefijos, extensiones o precios en `src/constants/index.ts` y exportar tipos derivados si aplica.
3. **Implementar la logica pura**: si involucra FS, agregar funciones en `src/utils/fsUtils.ts` (sin dependencias de VS Code) para poder testearlas.
4. **Agregar el servicio o provider**: extender `FileManagerService`, `InstallationService` o crear el nuevo provider en `src/providers/`.
5. **Conectar el command**: registrar en `src/subscriptions/commandSubscriptions.ts` y declarar en `package.json` (`contributes.commands` + `menus`).
6. **Registrar en el composition root**: instanciar y registrar en `src/extension.ts` (providers, `refreshAll`, suscripciones).
7. **Extender la UI declarativa**: vistas, botones `view/title` y `view/item/context` en `package.json` con los `when` adecuados (`view == ...`, `viewItem == ...`).
8. **Agregar tests**: en `test/*.test.ts` con vitest (patron Arrange/Act/Assert) para toda logica pura nueva.
9. **Validar**: `npm run compile`, `npm test`, empaquetar con `vsce package --out src/versions/<nombre>-<version>.vsix` e instalar con la CLI completa de VS Code (la extension se prueba instalada, no con F5).
10. **Actualizar README y version**: documentar nuevos comandos y subir `version` en `package.json`.

### Convenciones y Estandares

- **Naming de comandos**: prefijo `fhizxAiTools.`; verbos en infinitivo (`create`, `rename`, `delete`, `install`, `toggle`, `open`, `send`, `copy`).
- **Comandos dinamicos**: `fhizxAiTools.create<Category>File|Folder` generados con `COMMAND_PREFIX` + `capitalizeCategory`; mantener el patron al agregar categorias.
- **Constantes**: todo valor repetido vive en `src/constants/index.ts`; no duplicar strings magicos en services ni providers.
- **Tipos derivados**: exportar tipos (`CategoryType`) desde `constants` y no redefinirlos.
- **Estructura de carpetas**: `src/providers/` (UI), `src/services/` (dominio), `src/models/` (modelos), `src/subscriptions/` (comandos), `src/utils/` (utilidades), `src/constants/`, `test/`.
- **Extension de archivos**: recursos instalables `.prompt.md`; notes `.md`; conversion con `toPromptFileName`.
- **Prefijos de categoria**: `p-`, `a-`, `s-`, `c-` y sin prefijo para notes.
- **Registro de proveedores**: declarar vistas y menus en `package.json`; los `contextValue` de los modelos son el contrato con los menus.
- **Idioma**: mensajes de usuario en espanol; codigo y comentarios en ingles donde sea idiomático; tests con Given/When/Then en ingles.
- **Tests**: vitest ^2 (vitest 4 no resuelve con `@types/node` 18); `npm test` = `vitest run`.

### Manejo de Errores

- **Contrato obligatorio**: operaciones FS mutantes (crear, renombrar, eliminar, abrir ruta, configurar) se envuelven en `try/catch` y usan `notifyFsError(accion, error)` (`resourceUtils.ts`) que loguea en consola y muestra `showErrorMessage`.
- **Lecturas seguras**: `safeReadFile` nunca lanza; devuelve `""` y loguea.
- **Predicados seguros**: `isDirectory` y `fileExists` no lanzan ante rutas inexistentes.
- **Fallos no criticos**: la actualizacion de `chat.promptFilesLocations` y la consulta a Marketplace fallan silenciosamente (`console.warn` o `resolve(undefined)`).
- **Precondiciones de UI**: antes de mutar, verificar ruta global configurada (`showWarningMessage` si falta) y existencia de destino.
- **Validaciones de negocio**: no sobrescribir archivos/carpetas existentes; bloquear renombrado con colision; confirmacion modal antes de eliminar.
- **Chat participant**: ante falta de ruta global o recurso inexistente se responde con mensaje Markdown en el propio chat (no excepciones).

---

## 7. Riesgos, Casos Borde y Deuda Tecnica

### Casos Borde (Edge Cases)

- **Ruta global vacia o con espacios**: `getGlobalPathConfig` y `getGlobalCategoryPath` truncan/descartan rutas en blanco; el onboarding se re-muestra al activar.
- **Ruta global apuntando a un directorio inexistente**: las vistas devuelven listas vacias; `openGlobalPath` lo crea; `ensureGlobalStructure` lo reconstruye al activar o cambiar config.
- **Nombre de archivo con extension ya incluida**: al crear, se limpia la extension duplicada antes de aplicar prefijo.
- **Colision de nombres**: crear archivo/carpeta o renombrar con destino existente se bloquea con mensaje de error.
- **Instalacion de carpetas**: `installItem`, `uninstallItem` y `toggleItem` ignoran carpetas (return temprano).
- **Notes no instalable**: la categoria `notes` no aparece en `COPILOT_CATEGORIES`; los menus de instalacion excluyen la vista notes con `when`.
- **Nombre con extensiones compuestas**: `toPromptFileName` maneja `.prompt.md`, `.instructions.md`, `.md` y sin extension.
- **Búsqueda en chat por nombre parcial**: `findFileRecursive` tolera buscar sin extension; un nombre que exista como `.md` y como `.prompt.md` resuelve el primero encontrado (orden de `readdirSync`, no determinista por categoria).
- **Archivos sin editor activo**: el token counter muestra un mensaje placeholder.
- **Encoder de tokens fallido**: `js-tiktoken` puede lanzar con textos invalidos; se estima con caracteres/4.
- **Vista oculta / layout corrupto**: VS Code persiste `viewLocations` en `state.vscdb`; si la vista no aparece, `Developer: Reset View Locations` corrige.
- **Extension no publicada**: el publisher es `undefined_publisher`; `checkForUpdates` depende de esa identidad y de conectividad de red (timeout 8s).
- **Chat sin soporte de query**: `sendToChat` cae a portapapeles + chat vacio.
- **Multiples archivos con mismo nombre en subcarpetas**: `listar` solo muestra primer nivel; `usar` busca recursivo y toma el primero que encuentra.

### Atencion Especial

- **Rendimiento (FS sincrono)**: todas las operaciones de disco son sincronas (`readdirSync`, `writeFileSync`, `copyFileSync`, `statSync`) sobre el hilo principal de la extension; con miles de archivos o directorios remotos (red, cloud sync) la UI puede bloquearse.
- **Recursion**: `findFileRecursive` es recursivo sin limite de profundidad; rutas muy profundas o ciclos simbolicos (symlinks) podrian causar recursion excesiva.
- **Seguridad**: los nombres de archivo se interpolan directamente en rutas (sin sanitizacion); un nombre con separadores (`../`) podria escapar del directorio de categoria si la entrada proviene de fuentes no confiables; hoy el input es del usuario, pero conviene validar.
- **Persistencia de configuracion**: `chat.promptFilesLocations` se actualiza con `ConfigurationTarget.Global`; depende de que el setting exista en la version de VS Code (se ignora silenciosamente si no).
- **Integracion con Copilot**: la extension asume la ruta `~/.vscode/github-copilot/`; cambios de Copilot en su layout interno romperian la instalacion.
- **Sincronizacion de datos**: la extension usa un `FileSystemWatcher` sobre la ruta global y ademas invoca `scheduleExplicitPush()` tras cada operacion CRUD (crear, renombrar, eliminar archivo/carpeta), independientemente de si auto-sync esta activado. Cuando auto-sync esta activado, los cambios detectados por el watcher tambien se suben automaticamente tras un debounce de 1,5 s. Carpetas vacias se sincronizan mediante un `.gitkeep` virtual generado por `collectLocalFiles`.
- **Push como snapshot completo**: cada push crea un arbol git sin `base_tree`, de modo que el repositorio remoto es un espejo exacto del estado local. Archivos eliminados localmente desaparecen del remoto en el siguiente push. El primer push a un repo vacio crea la referencia de la rama con `POST /git/refs`; pushes subsecuentes actualizan la ref con `force: true`.
- **Pull desde la nube**: la descarga de blobs usa la respuesta JSON (base64) en lugar de `Accept: application/vnd.github.raw`, ya que el media type raw puede no devolver contenido correctamente en todos los escenarios. Cada blob se descarga con try-catch individual para tolerar fallos parciales sin abortar la operacion completa.

### Deuda Tecnica Identificada

- **FS sincrono generalizado**: migrar a APIs asincronas (`fs/promises`) en operaciones de escritura/lectura masivas.
- **Tests limitados**: `fsUtils` y `cloudUtils` tienen cobertura (24 tests); faltan tests para `FileManagerService`, `InstallationService`, `ChatParticipantService`, providers y comandos.
- **Precios de modelos hardcodeados** en `MODEL_PRICES`; deberian ser configurables o provenir de una fuente externa.
- **Encoder unico (`cl100k_base`)** para todos los modelos, aunque Claude/Gemini usan tokenizers distintos; los costos son aproximados.
- **Publisher `undefined_publisher`**: la extension no esta publicada; `checkForUpdates` y el link de Marketplace dependen de una identidad que no existe oficialmente.
- **Parsing del chat participant por regex**: frágil ante variaciones de idioma/espacios; considerar un parser mas robusto o comandos slash.
- **Duplicidad de logica de configuracion**: `ensureCopilotPromptConfig` (extension.ts) y `updateCopilotConfig` (installationService) hacen lo mismo; consolidar.
- **`getChildren` de Configurations construye items "info" que simulan botones** con emojis en el label; al renderizar como TreeItems pierden accesibilidad y orden estable; considerar `TreeItem2` con botones reales o `view/title` en su lugar.
- **Validacion de extension duplicada**: al crear archivos, la logica de limpieza de extension no cubre todos los casos (por ejemplo, nombres que terminan en `.prompt.md` con espacios).
- **`checkForUpdates` con ID hardcodeado** de extension en dos sitios (comando y URL); centralizar en constantes.
- **Vista Configurations usa caracteres de emoji en los labels** de los items de accion y encabezados, que dependen del soporte de fuente del tema; convendria migrarlos a `ThemeIcon` declarativos o labels planos.
- **Falta documentacion de arquitectura en el repo**: este documento mitiga parcialmente; conviene mantenerlo al dia con cada release.
- **`diffLocalVsRemote` con semantica ambigua**: la funcion retorna `toUpload` (local-only) y `toDelete` (remote-only); estos nombres tienen sentido para push pero son confusos en pull. El caller de pull ahora usa `toUpload` renombrado a `localOnly` para eliminar archivos locales obsoletos. Considerar renombrar la API a `localOnly` / `remoteOnly` para claridad.
