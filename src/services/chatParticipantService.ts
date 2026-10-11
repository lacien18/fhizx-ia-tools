import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileManagerService } from "./fileManagerService";
import {
  CHAT_PARTICIPANT_ID,
  COMMANDS,
  COPILOT_CATEGORIES,
} from "../constants";
import {
  isCategoryFileName,
  normalizeCategoryFilePath,
  safeReadFile,
} from "../utils/fsUtils";
import { getGlobalPathConfig } from "../utils/resourceUtils";
import { parseVoiceNoteRequest } from "../utils/voiceNoteUtils";

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  fileManager: FileManagerService,
) {
  const chatParticipant = vscode.chat.createChatParticipant(
    CHAT_PARTICIPANT_ID,
    async (request, _context, response) => {
      const promptQuery = request.prompt.trim();
      const globalPath = getGlobalPathConfig();

      if (!globalPath) {
        response.markdown("Configura la ruta global de la extensión primero.");
        return;
      }

      // @fhizx-ai-tools listar [filtro]
      const listMatch = promptQuery.match(/^listar(?:\s+(.+))?$/i);
      if (listMatch) {
        const filter = listMatch[1]?.trim().toLowerCase();
        const lines: string[] = [];

        for (const cat of COPILOT_CATEGORIES) {
          const catDir = path.join(globalPath, cat);
          if (!fs.existsSync(catDir)) continue;

          let fileNames: string[] = [];
          try {
            fileNames = fs
              .readdirSync(catDir, { withFileTypes: true })
              .filter((entry) => entry.isFile())
              .map((entry) =>
                normalizeCategoryFilePath(path.join(catDir, entry.name), cat),
              )
              .filter((filePath): filePath is string => Boolean(filePath))
              .map((filePath) => path.basename(filePath))
              .filter((name) => isCategoryFileName(name, cat))
              .filter((name) => !filter || name.toLowerCase().includes(filter))
              .sort();
          } catch {
            continue;
          }

          if (fileNames.length > 0) {
            lines.push(`### ${cat}`);
            lines.push(...fileNames.map((name) => `- \`${name}\``));
          }
        }

        if (lines.length === 0) {
          response.markdown(
            "No hay recursos que coincidan en tu espacio global.",
          );
        } else {
          response.markdown(lines.join("\n"));
        }
        return;
      }

      // @fhizx-ai-tools nota --nombre "Nombre" --contenido <dictado>
      if (/^nota(?:\s|$)/i.test(promptQuery)) {
        const noteRequest = parseVoiceNoteRequest(promptQuery);
        if (!noteRequest) {
          response.markdown(
            "No recibí el contenido dictado. Vuelve a dictarlo y envía el mensaje para guardar la nota.",
          );
          return;
        }

        const created = await vscode.commands.executeCommand<boolean>(
          COMMANDS.CREATE_VOICE_NOTE,
          noteRequest.name,
          noteRequest.content,
        );
        response.markdown(
          created
            ? `Nota creada en Notes: **${noteRequest.name}**.`
            : "No se pudo guardar la nota. Revisa el aviso de VS Code y vuelve a intentarlo.",
        );
        return;
      }

      // @fhizx-ai-tools usar <nombre>
      const match = promptQuery.match(/usar\s+(.+)/i);
      if (match) {
        const promptName = match[1].trim();
        let promptFilePath: string | null = null;

        for (const cat of COPILOT_CATEGORIES) {
          promptFilePath = fileManager.findFileRecursive(
            path.join(globalPath, cat),
            promptName,
            cat,
          );
          if (promptFilePath) break;
        }

        if (promptFilePath && fs.existsSync(promptFilePath)) {
          const content = safeReadFile(promptFilePath);
          if (content) {
            response.markdown(
              `### Recurso cargado: \`${promptName}\`\n\n${content}`,
            );
            return;
          }
        }

        response.markdown(
          `No se encontró el recurso \`${promptName}\` en tu espacio de trabajo global.`,
        );
        return;
      }

      response.markdown(
        "Usa `@fhizx-ai-tools usar <nombre>` para cargar un recurso, `@fhizx-ai-tools listar` para ver los disponibles o dicta una nota desde la sección Notes.",
      );
    },
  );

  chatParticipant.iconPath = vscode.Uri.file(
    path.join(context.extensionPath, "assets", "logo.png"),
  );
  context.subscriptions.push(chatParticipant);
}
