import * as os from "os";
import * as path from "path";

export const CATEGORIES = [
  "prompts",
  "agents",
  "skills",
  "context",
  "notes",
] as const;

export type CategoryType = (typeof CATEGORIES)[number];

export const COPILOT_CATEGORIES = [
  "prompts",
  "agents",
  "skills",
  "context",
] as const;

export const FILE_PREFIXES: Record<CategoryType, string> = {
  prompts: "p-",
  agents: "a-",
  skills: "s-",
  context: "c-",
  notes: "",
} as const;

export const CONFIG_NAMESPACE = "fhizxAiTools";

export const CONFIG_KEYS = {
  GLOBAL_PATH: "globalPath",
  PROMPT_FILES_LOCATIONS: "chat.promptFilesLocations",
  CLOUD_OWNER: "cloud.owner",
  CLOUD_REPO: "cloud.repo",
  CLOUD_AUTO_SYNC: "cloud.autoSync",
} as const;

export const VIEW_IDS = {
  PROMPTS: "fhizxAiTools.prompts",
  AGENTS: "fhizxAiTools.agents",
  SKILLS: "fhizxAiTools.skills",
  CONTEXT: "fhizxAiTools.context",
  NOTES: "fhizxAiTools.notes",
  TOKEN_COUNTER: "fhizxAiTools.tokenCounter",
  CONFIGURATIONS: "fhizxAiTools.configurations",
} as const;

export const COMMANDS = {
  OPEN_FILE: "fhizxAiTools.openFile",
  PREVIEW_MARKDOWN: "fhizxAiTools.previewMarkdown",
  SET_GLOBAL_PATH: "fhizxAiTools.setGlobalPath",
  REFRESH: "fhizxAiTools.refresh",
  SEND_TO_CHAT: "fhizxAiTools.sendToChat",
  TOGGLE_INSTALL: "fhizxAiTools.toggleInstall",
  OPEN_GLOBAL_PATH: "fhizxAiTools.openGlobalPath",
  COPY_TO_CLIPBOARD: "fhizxAiTools.copyToClipboard",
  CREATE_FILE_CONTEXT: "fhizxAiTools.createFileContext",
  CREATE_FOLDER_CONTEXT: "fhizxAiTools.createFolderContext",
  RENAME_ITEM: "fhizxAiTools.renameItem",
  DELETE_ITEM: "fhizxAiTools.deleteItem",
  INSTALL_ITEM: "fhizxAiTools.installItem",
  UNINSTALL_ITEM: "fhizxAiTools.uninstallItem",
  CHECK_FOR_UPDATES: "fhizxAiTools.checkForUpdates",
  WORKBENCH_CHAT_OPEN: "workbench.action.chat.open",
  LIST: "fhizxAiTools.list",
  CLOUD_CONNECT: "fhizxAiTools.cloudConnect",
  CLOUD_PUSH: "fhizxAiTools.cloudPush",
  CLOUD_PULL: "fhizxAiTools.cloudPull",
  CLOUD_DISCONNECT: "fhizxAiTools.cloudDisconnect",
  CLOUD_TOGGLE_AUTO_SYNC: "fhizxAiTools.cloudToggleAutoSync",
} as const;

export const COMMAND_PREFIX = {
  CREATE: "fhizxAiTools.create",
  SUFFIX_FILE: "File",
  SUFFIX_FOLDER: "Folder",
} as const;

export const FILE_EXTENSIONS = {
  MARKDOWN: ".md",
  PROMPT_MD: ".prompt.md",
} as const;

export const ICONS = {
  PASSED: "testing-passed-icon",
  ERROR: "notebook-state-error",
} as const;

export const MODEL_PRICES = {
  GPT_4O: 2.5,
  GPT_4O_MINI: 0.15,
  CLAUDE_SONNET: 3.0,
  GEMINI_FLASH: 0.1,
} as const;

export const TOKENS_PER_MILLION = 1_000_000;

export const ENCODING_NAME = "cl100k_base";

export const CHAT_PARTICIPANT_ID = "fhizx-ai-tools.participant";

export const COPILOT_BASE_DIR = path.join(
  os.homedir(),
  ".vscode",
  "github-copilot",
);

export function capitalizeCategory(category: CategoryType): string {
  const singular = category.endsWith("s") ? category.slice(0, -1) : category;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}
