import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  collectLocalFiles,
  diffLocalVsRemote,
  toPosixRelativePath,
} from "../src/utils/cloudUtils";

describe("cloudUtils ==>", () => {
  let tmpDir: string;

  beforeEach(() => {
    // Arrange: directorio temporal aislado para cada prueba
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fhiz-cloud-test-"));
  });

  afterEach(() => {
    // Cleanup: elimina el directorio temporal
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("Data test ==> toPosixRelativePath", () => {
    it("Given a nested file path, When converting, Then returns posix relative path", () => {
      // Arrange
      const abs = path.join(tmpDir, "prompts", "p-ejemplo.prompt.md");
      // Act
      const result = toPosixRelativePath(abs, tmpDir);
      // Assert
      expect(result).toBe("prompts/p-ejemplo.prompt.md");
    });

    it("Given a root file path, When converting, Then returns just the file name", () => {
      // Arrange
      const abs = path.join(tmpDir, "nota.md");
      // Act
      const result = toPosixRelativePath(abs, tmpDir);
      // Assert
      expect(result).toBe("nota.md");
    });
  });

  describe("Data test ==> collectLocalFiles", () => {
    it("Given a directory with nested files, When collecting, Then returns all relative paths", () => {
      // Arrange
      const prompts = path.join(tmpDir, "prompts");
      const agents = path.join(tmpDir, "agents");
      fs.mkdirSync(prompts);
      fs.mkdirSync(agents);
      fs.writeFileSync(path.join(prompts, "p-a.prompt.md"), "x");
      fs.writeFileSync(path.join(prompts, "p-b.prompt.md"), "x");
      fs.writeFileSync(path.join(agents, "a-1.prompt.md"), "x");
      // Act
      const result = collectLocalFiles(tmpDir);
      // Assert
      expect(result).toEqual([
        "agents/a-1.prompt.md",
        "prompts/p-a.prompt.md",
        "prompts/p-b.prompt.md",
      ]);
    });

    it("Given hidden and system files, When collecting, Then ignores them", () => {
      // Arrange
      fs.writeFileSync(path.join(tmpDir, ".DS_Store"), "x");
      fs.writeFileSync(path.join(tmpDir, "nota.md"), "x");
      const gitDir = path.join(tmpDir, ".git");
      fs.mkdirSync(gitDir);
      fs.writeFileSync(path.join(gitDir, "config"), "x");
      // Act
      const result = collectLocalFiles(tmpDir);
      // Assert
      expect(result).toEqual(["nota.md"]);
    });

    it("Given an empty directory, When collecting, Then returns empty array", () => {
      // Act
      const result = collectLocalFiles(tmpDir);
      // Assert
      expect(result).toEqual([]);
    });

    it("Given a missing directory, When collecting, Then returns empty array", () => {
      // Act
      const result = collectLocalFiles(path.join(tmpDir, "no-existe"));
      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("Data test ==> diffLocalVsRemote", () => {
    it("Given equal local and remote files, When diffing, Then nothing to upload or delete", () => {
      // Arrange
      const local = ["prompts/p-a.prompt.md", "notes/n.md"];
      const remote = ["notes/n.md", "prompts/p-a.prompt.md"];
      // Act
      const result = diffLocalVsRemote(local, remote);
      // Assert
      expect(result).toEqual({ toUpload: [], toDelete: [] });
    });

    it("Given new local files, When diffing, Then they appear in toUpload", () => {
      // Arrange
      const local = ["prompts/p-a.prompt.md", "agents/a-b.prompt.md"];
      const remote = ["prompts/p-a.prompt.md"];
      // Act
      const result = diffLocalVsRemote(local, remote);
      // Assert
      expect(result.toUpload).toEqual(["agents/a-b.prompt.md"]);
      expect(result.toDelete).toEqual([]);
    });

    it("Given removed local files, When diffing, Then they appear in toDelete", () => {
      // Arrange
      const local = ["prompts/p-a.prompt.md"];
      const remote = ["prompts/p-a.prompt.md", "skills/s-x.prompt.md"];
      // Act
      const result = diffLocalVsRemote(local, remote);
      // Assert
      expect(result.toDelete).toEqual(["skills/s-x.prompt.md"]);
      expect(result.toUpload).toEqual([]);
    });
  });
});
