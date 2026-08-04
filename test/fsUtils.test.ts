import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  fileExists,
  isDirectory,
  safeReadFile,
  deletePath,
  toPromptFileName,
} from "../src/utils/fsUtils";

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

    it("Given a name without extension, When converting, Then appends .prompt.md", () => {
      // Arrange
      const input = "p-ejemplo";
      // Act
      const result = toPromptFileName(input);
      // Assert
      expect(result).toBe("p-ejemplo.prompt.md");
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
