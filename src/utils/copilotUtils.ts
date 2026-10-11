import * as path from "path";
import {
  COPILOT_BASE_DIR,
  FILE_PREFIXES,
  LEGACY_COPILOT_BASE_DIR,
  type CategoryType,
} from "../constants";
import { stripCategoryFileExtension, toCopilotFileName } from "./fsUtils";

export function getCopilotGlobalPath(
  category: CategoryType,
  userProfileDirectory: string,
): string {
  if (category === "prompts") {
    return path.join(userProfileDirectory, "prompts");
  }

  if (
    category === "agents" ||
    category === "skills" ||
    category === "instructions"
  ) {
    return path.join(COPILOT_BASE_DIR, category);
  }

  return path.join(LEGACY_COPILOT_BASE_DIR, category);
}

export function getCopilotTargetPath(
  fileName: string,
  category: CategoryType,
  userProfileDirectory: string,
): string {
  const categoryPath = getCopilotGlobalPath(category, userProfileDirectory);

  if (category === "skills") {
    return path.join(categoryPath, getCopilotSkillName(fileName), "SKILL.md");
  }

  const targetFileName = toCopilotFileName(fileName, category);
  return path.join(categoryPath, targetFileName);
}

export function getCopilotSkillName(fileName: string): string {
  const baseName = stripCategoryFileExtension(fileName);
  const prefix = FILE_PREFIXES.skills;
  const unprefixedName = baseName.startsWith(prefix)
    ? baseName.slice(prefix.length)
    : baseName;
  const skillName = unprefixedName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");

  return skillName || "skill";
}