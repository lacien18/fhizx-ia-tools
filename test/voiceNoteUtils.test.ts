import { describe, expect, it } from "vitest";
import { parseVoiceNoteRequest } from "../src/utils/voiceNoteUtils";

describe("voiceNoteUtils ==>", () => {
  describe("Data test ==> parseVoiceNoteRequest", () => {
    it("Given a named voice note request, When parsing, Then separates the name from dictated content", () => {
      // Arrange
      const prompt = `nota --nombre ${JSON.stringify("Ideas del proyecto")} --contenido Recordar revisar el presupuesto y enviar el resumen.`;
      // Act
      const result = parseVoiceNoteRequest(prompt);
      // Assert
      expect(result).toEqual({
        name: "Ideas del proyecto",
        content: "Recordar revisar el presupuesto y enviar el resumen.",
      });
    });

    it("Given a name containing quotes, When parsing, Then preserves the exact name and transcript", () => {
      // Arrange
      const name = 'Reunión "Q4"';
      const content = "Primera línea\ny segunda línea.";
      const prompt = `nota --nombre ${JSON.stringify(name)} --contenido ${content}`;
      // Act
      const result = parseVoiceNoteRequest(prompt);
      // Assert
      expect(result).toEqual({ name, content });
    });
  });

  describe("Exception test ==> parseVoiceNoteRequest", () => {
    it("Given a request without dictated content, When parsing, Then returns null", () => {
      // Arrange
      const prompt = `nota --nombre ${JSON.stringify("Ideas del proyecto")} --contenido `;
      // Act
      const result = parseVoiceNoteRequest(prompt);
      // Assert
      expect(result).toBeNull();
    });
  });
});