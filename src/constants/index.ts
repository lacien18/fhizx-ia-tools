export const CATEGORIES = [
  "prompts",
  "agents",
  "skills",
  "context",
  "notes",
] as const;

export const COPILOT_CATEGORIES = [
  "prompts",
  "agents",
  "skills",
  "context",
] as const;

export const FILE_PREFIXES = {
  prompts: "p-",
  agents: "a-",
  skills: "s-",
  context: "c-",
} as const;

export const CONFIG_NAMESPACE = "fhizxAiTools";

export const CONFIG_KEYS = {
  GLOBAL_PATH: "globalPath",
  PROMPT_FILES_LOCATIONS: "chat.promptFilesLocations",
} as const;

export const COMMANDS = {
  OPEN_FILE: "fhizxAiTools.openFile",
  SET_GLOBAL_PATH: "fhizxAiTools.setGlobalPath",
  REFRESH: "fhizxAiTools.refresh",
  SEND_TO_CHAT: "fhizxAiTools.sendToChat",
} as const;

export const MODEL_PRICES = {
  GPT_4O: 2.5,
  GPT_4O_MINI: 0.15,
  CLAUDE_SONNET: 3.0,
  GEMINI_FLASH: 0.1,
} as const;

export const ENCODING_NAME = "cl100k_base";

export const CHAT_PARTICIPANT_ID = "fhizx-ai-tools.participant";
