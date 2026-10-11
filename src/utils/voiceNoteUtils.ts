export interface VoiceNoteRequest {
  name: string;
  content: string;
}

export function parseVoiceNoteRequest(prompt: string): VoiceNoteRequest | null {
  const match = prompt.trim().match(
    /^nota\s+--nombre\s+("(?:\\.|[^"\\])*?")\s+--contenido(?:\s+([\s\S]*))?$/i,
  );
  if (!match) return null;

  let name: unknown;
  try {
    name = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const content = match[2]?.trim() || "";
  if (typeof name !== "string" || !name.trim() || !content) return null;

  return { name: name.trim(), content };
}