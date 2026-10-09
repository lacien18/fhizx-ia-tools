import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  fileExists,
  isDirectory,
  safeReadFile,
  deletePath,
  isCategoryFileName,
  normalizeCategoryFileName,
  normalizeCategoryFilePath,
  stripCategoryFileExtension,
  toPromptFileName,
} from "../src/utils/fsUtils";
import { CATEGORY_FILE_EXTENSIONS, type CategoryType } from "../src/constants";

describe("fsUtils ==>", () => {
  let tmpDir: string;

  beforeEach(() => {
    // Arrange: directorio temporal aislado para cada prueba
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fhiz-tools-test-"));
  });

  afterEach(() => {
    // Cleanup: elimina el directorio temporal
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("Data test ==> toPromptFileName", () => {
    it("Given a .prompt.md file name, When converting, Then returns it unchanged", () => {
      // Arrange
      const input = "p-ejemplo.prompt.md";
      // Act
      const result = toPromptFileName(input);
      // Assert
      expect(result).toBe("p-ejemplo.prompt.md");
    });

    it("Given a .md file name, When converting, Then returns a .prompt.md name", () => {
      // Arrange
      const input = "p-ejemplo.md";
      // Act
      const result = toPromptFileName(input);
      // Assert
      expect(result).toBe("p-ejemplo.prompt.md");
    });

    it("Given a .instructions.md file name, When converting, Then returns a .prompt.md name", () => {
      // Arrange
      const input = "p-ejemplo.instructions.md";
      // Act
      const result = toPromptFileName(input);
      // Assert
      expect(result).toBe("p-ejemplo.prompt.md");
    });

    it("Given agent, skill and context file names, When converting, Then returns .prompt.md names", () => {
      // Arrange
      const inputs = [
        "a-ejemplo.agent.md",
        "s-ejemplo.skill.md",
        "c-ejemplo.context.md",
      ];
      // Act
      const results = inputs.map(toPromptFileName);
      // Assert
      expect(results).toEqual([
        "a-ejemplo.prompt.md",
        "s-ejemplo.prompt.md",
        "c-ejemplo.prompt.md",
      ]);
    });

    it("Given a name without extension, When converting, Then appends .prompt.md", () => {
      // Arrange
      const input = "p-ejemplo";
      // Act
      const result = toPromptFileName(input);
      // Assert
      expect(result).toBe("p-ejemplo.prompt.md");
    });
  });

  describe("Data test ==> category extensions", () => {
    it("Given each resource category, When reading its extension, Then returns the requested suffix", () => {
      // Arrange
      const expectedExtensions: Record<CategoryType, string> = {
        prompts: ".prompt.md",
        agents: ".agent.md",
        skills: ".skill.md",
        instructions: ".instructions.md",
        context: ".context.md",
        notes: ".md",
      };
      // Act
      const result = CATEGORY_FILE_EXTENSIONS;
      // Assert
      expect(result).toEqual(expectedExtensions);
    });

    it("Given one file for each category, When checking its name, Then accepts only the matching category", () => {
      // Arrange
      const filesByCategory: Record<CategoryType, string> = {
        prompts: "p-ejemplo.prompt.md",
        agents: "a-ejemplo.agent.md",
        skills: "s-ejemplo.skill.md",
        instructions: "i-ejemplo.instructions.md",
        context: "c-ejemplo.context.md",
        notes: "nota.md",
      };
      // Act
      const result = Object.entries(filesByCategory).map(
        ([category, fileName]) =>
          isCategoryFileName(fileName, category as CategoryType),
      );
      // Assert
      expect(result).toEqual([true, true, true, true, true, true]);
    });

    it("Given a specialized Markdown file in notes, When checking its name, Then rejects it as a note", () => {
      // Arrange
      const fileName = "s-ejemplo.skill.md";
      // Act
      const result = isCategoryFileName(fileName, "notes");
      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Data test ==> normalize category extensions", () => {
    it("Given a generic Markdown file in skills, When normalizing its name, Then adds the skill suffix", () => {
      // Arrange
      const input = "mi-habilidad.md";
      // Act
      const result = normalizeCategoryFileName(input, "skills");
      // Assert
      expect(result).toBe("mi-habilidad.skill.md");
    });

    it("Given a text file in skills, When normalizing its name, Then replaces its extension with the skill suffix", () => {
      // Arrange
      const input = "mi-habilidad.txt";
      // Act
      const result = normalizeCategoryFileName(input, "skills");
      // Assert
      expect(result).toBe("mi-habilidad.skill.md");
    });

    it("Given a skill file in notes, When normalizing its name, Then changes it to a Markdown note", () => {
      // Arrange
      const input = "mi-nota.skill.md";
      // Act
      const result = normalizeCategoryFileName(input, "notes");
      // Assert
      expect(result).toBe("mi-nota.md");
    });

    it("Given a file with an incorrect extension, When normalizing its path, Then renames it without overwriting an existing file", () => {
      // Arrange
      const sourcePath = path.join(tmpDir, "mi-prompt.md");
      const existingPath = path.join(tmpDir, "mi-prompt.prompt.md");
      fs.writeFileSync(sourcePath, "contenido original");
      fs.writeFileSync(existingPath, "contenido existente");
      // Act
      const result = normalizeCategoryFilePath(sourcePath, "prompts");
      // Assert
      expect(result).toBe(path.join(tmpDir, "mi-prompt-2.prompt.md"));
      expect(fs.readFileSync(result!, "utf-8")).toBe("contenido original");
      expect(fs.readFileSync(existingPath, "utf-8")).toBe("contenido existente");
    });
  });

  describe("Data test ==> stripCategoryFileExtension", () => {
    it("Given a categorized file name, When stripping its extension, Then returns the base name", () => {
      // Arrange
      const input = "a-ejemplo.agent.md";
      // Act
      const result = stripCategoryFileExtension(input);
      // Assert
      expect(result).toBe("a-ejemplo");
    });
  });

  describe("Data test ==> file detection", () => {
    it("Given an existing file, When checking fileExists, Then returns true", () => {
      // Arrange
      const filePath = path.join(tmpDir, "a.md");
      fs.writeFileSync(filePath, "contenido");
      // Act
      const result = fileExists(filePath);
      // Assert
      expect(result).toBe(true);
    });

    it("Given a missing file, When checking fileExists, Then returns false", () => {
      // Arrange
      const filePath = path.join(tmpDir, "no-existe.md");
      // Act
      const result = fileExists(filePath);
      // Assert
      expect(result).toBe(false);
    });

    it("Given a directory, When checking isDirectory, Then returns true", () => {
      // Arrange
      const dirPath = path.join(tmpDir, "carpeta");
      fs.mkdirSync(dirPath);
      // Act
      const result = isDirectory(dirPath);
      // Assert
      expect(result).toBe(true);
    });

    it("Given a file, When checking isDirectory, Then returns false", () => {
      // Arrange
      const filePath = path.join(tmpDir, "b.md");
      fs.writeFileSync(filePath, "x");
      // Act
      const result = isDirectory(filePath);
      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Data test ==> safeReadFile", () => {
    it("Given an existing file, When reading, Then returns its content", () => {
      // Arrange
      const filePath = path.join(tmpDir, "leer.md");
      fs.writeFileSync(filePath, "Hola FhizxAITools");
      // Act
      const result = safeReadFile(filePath);
      // Assert
      expect(result).toBe("Hola FhizxAITools");
    });
  });

  describe("Exception test ==> safeReadFile", () => {
    it("Given a missing file, When reading with safeReadFile, Then returns an empty string without throwing", () => {
      // Arrange
      const filePath = path.join(tmpDir, "no-existe.md");
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      // Act
      const result = safeReadFile(filePath);
      // Assert
      expect(result).toBe("");
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Data test ==> deletePath", () => {
    it("Given an existing file, When deleting without recursion, Then the file is removed", () => {
      // Arrange
      const filePath = path.join(tmpDir, "borrar.md");
      fs.writeFileSync(filePath, "x");
      // Act
      deletePath(filePath, false);
      // Assert
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("Given a directory with content, When deleting with recursion, Then the directory is removed", () => {
      // Arrange
      const dirPath = path.join(tmpDir, "borrar-carpeta");
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, "hijo.md"), "x");
      // Act
      deletePath(dirPath, true);
      // Assert
      expect(fs.existsSync(dirPath)).toBe(false);
    });
  });

  describe("Exception test ==> isDirectory", () => {
    it("Given a nonexistent path, When checking isDirectory, Then returns false without throwing", () => {
      // Arrange
      const missingPath = path.join(tmpDir, "no-existe");
      // Act
      const result = isDirectory(missingPath);
      // Assert
      expect(result).toBe(false);
    });
  });
});
