import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileManagerService } from "./fileManagerService";
import { CHAT_PARTICIPANT_ID, COPILOT_CATEGORIES } from "../constants";
import { safeReadFile } from "../utils/fsUtils";
import { getGlobalPathConfig } from "../utils/resourceUtils";

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
              .map((entry) => entry.name)
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

      // @fhizx-ai-tools usar <nombre>
      const match = promptQuery.match(/usar\s+(.+)/i);
      if (match) {
        const promptName = match[1].trim();
        let promptFilePath: string | null = null;

        for (const cat of COPILOT_CATEGORIES) {
          promptFilePath = fileManager.findFileRecursive(
            path.join(globalPath, cat),
            promptName,
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
        "Usa `@fhizx-ai-tools usar <nombre>` para cargar un recurso o `@fhizx-ai-tools listar` para ver los disponibles.",
      );
    },
  );

  chatParticipant.iconPath = vscode.Uri.file(
    path.join(context.extensionPath, "assets", "logo.png"),
  );
  context.subscriptions.push(chatParticipant);
}
