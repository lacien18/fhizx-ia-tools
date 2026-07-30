import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileManagerService } from "./fileManagerService";
import { CHAT_PARTICIPANT_ID, CONFIG_NAMESPACE, CONFIG_KEYS, COPILOT_CATEGORIES } from "../constants";

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  fileManager: FileManagerService,
) {
  const chatParticipant = vscode.chat.createChatParticipant(
    CHAT_PARTICIPANT_ID,
    async (request, context, response) => {
      const promptQuery = request.prompt.trim();
      const globalPath = vscode.workspace
        .getConfiguration(CONFIG_NAMESPACE)
        .get<string>(CONFIG_KEYS.GLOBAL_PATH);

      if (!globalPath) {
        response.markdown("Configura la ruta global de la extensión primero.");
        return;
      }

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
          const content = fs.readFileSync(promptFilePath, "utf-8");
          response.markdown(
            `### Recurso cargado: \`${promptName}\`\n\n${content}`,
          );
          return;
        } else {
          response.markdown(
            `No se encontró el recurso \`${promptName}\` en tu espacio de trabajo global.`,
          );
          return;
        }
      }

      response.markdown(
        "Usa `@fhizx-ai-tools usar <nombre>` para invocar tus prompts, agents o skills.",
      );
    },
  );

  chatParticipant.iconPath = vscode.Uri.file(
    path.join(context.extensionPath, "media", "icon.svg"),
  );
  context.subscriptions.push(chatParticipant);
}
