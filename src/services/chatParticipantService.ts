import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileManagerService } from "./fileManagerService";

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  fileManager: FileManagerService,
) {
  const chatParticipant = vscode.chat.createChatParticipant(
    "fhizx-ai-tools.participant",
    async (request, context, response) => {
      const promptQuery = request.prompt.trim();
      const globalPath = vscode.workspace
        .getConfiguration("fhizxAiTools")
        .get<string>("globalPath");

      if (!globalPath) {
        response.markdown("Configura la ruta global de la extensión primero.");
        return;
      }

      const match = promptQuery.match(/usar\s+(.+)/i);
      if (match) {
        const promptName = match[1].trim();
        let promptFilePath = fileManager.findFileRecursive(
          path.join(globalPath, "prompts"),
          promptName,
        );
        if (!promptFilePath)
          promptFilePath = fileManager.findFileRecursive(
            path.join(globalPath, "agents"),
            promptName,
          );
        if (!promptFilePath)
          promptFilePath = fileManager.findFileRecursive(
            path.join(globalPath, "skills"),
            promptName,
          );

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
