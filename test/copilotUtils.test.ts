import { describe, expect, it } from "vitest";
import * as os from "os";
import * as path from "path";
import {
  getCopilotGlobalPath,
  getCopilotSkillName,
  getCopilotTargetPath,
} from "../src/utils/copilotUtils";
import { COPILOT_BASE_DIR, LEGACY_COPILOT_BASE_DIR } from "../src/constants";

describe("copilotUtils ==>", () => {
  const userProfileDirectory = path.join(os.tmpdir(), "vscode-profile");

  describe("Data test ==> installation paths", () => {
    it("Given a prompt, When resolving its installation directory, Then uses the active VS Code profile", () => {
      // Arrange
      const category = "prompts";
      // Act
      const result = getCopilotGlobalPath(category, userProfileDirectory);
      // Assert
      expect(result).toBe(path.join(userProfileDirectory, "prompts"));
    });

    it("Given an agent, skill, or instruction, When resolving its installation directory, Then uses the matching Copilot home folder", () => {
      // Arrange
      const categories = ["agents", "skills", "instructions"] as const;
      // Act
      const results = categories.map((category) =>
        getCopilotGlobalPath(category, userProfileDirectory),
      );
      // Assert
      expect(results).toEqual(
        categories.map((category) => path.join(COPILOT_BASE_DIR, category)),
      );
    });

    it("Given a context file, When resolving its installation directory, Then preserves its legacy prompt location", () => {
      // Arrange
      const category = "context";
      // Act
      const result = getCopilotGlobalPath(category, userProfileDirectory);
      // Assert
      expect(result).toBe(path.join(LEGACY_COPILOT_BASE_DIR, category));
    });
  });

  describe("Data test ==> category target files", () => {
    it("Given a prompt, When resolving its target, Then retains the prompt file extension", () => {
      // Arrange
      const fileName = "p-ejemplo.prompt.md";
      // Act
      const result = getCopilotTargetPath(
        fileName,
        "prompts",
        userProfileDirectory,
      );
      // Assert
      expect(result).toBe(
        path.join(userProfileDirectory, "prompts", fileName),
      );
    });

    it("Given an agent and instructions file, When resolving their targets, Then retains each native extension", () => {
      // Arrange
      const agent = "a-ejemplo.agent.md";
      const instruction = "i-ejemplo.instructions.md";
      // Act
      const agentPath = getCopilotTargetPath(
        agent,
        "agents",
        userProfileDirectory,
      );
      const instructionPath = getCopilotTargetPath(
        instruction,
        "instructions",
        userProfileDirectory,
      );
      // Assert
      expect(agentPath).toBe(path.join(COPILOT_BASE_DIR, "agents", agent));
      expect(instructionPath).toBe(
        path.join(COPILOT_BASE_DIR, "instructions", instruction),
      );
    });

    it("Given a skill file, When resolving its target, Then installs it as SKILL.md in a normalized skill folder", () => {
      // Arrange
      const fileName = "s-Revisión de API.skill.md";
      // Act
      const result = getCopilotTargetPath(
        fileName,
        "skills",
        userProfileDirectory,
      );
      // Assert
      expect(result).toBe(
        path.join(COPILOT_BASE_DIR, "skills", "revision-de-api", "SKILL.md"),
      );
    });
  });

  describe("Data test ==> skill names", () => {
    it("Given a skill name with spaces and accents, When normalizing it, Then returns a valid lowercase slug", () => {
      // Arrange
      const fileName = "Mi Habilidad de Revisión";
      // Act
      const result = getCopilotSkillName(fileName);
      // Assert
      expect(result).toBe("mi-habilidad-de-revision");
    });
  });
});