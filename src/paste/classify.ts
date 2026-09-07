export type PasteKind = "url" | "non-media-file" | "ignore";

const URL_PATTERN = /^https?:\/\/\S+$/i;

const MEDIA_EXTENSIONS = new Set([
  // images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  // audio
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "flac",
  "aac",
  // video
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "m4v",
]);

function isMediaMimeType(type: string): boolean {
  const lower = type.toLowerCase();
  return lower.startsWith("image/") || lower.startsWith("audio/") || lower.startsWith("video/");
}

function isMediaExtension(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot === -1) {
    return false;
  }
  const ext = name.slice(dot + 1).toLowerCase();
  return MEDIA_EXTENSIONS.has(ext);
}

export function classifyClipboardText(
  text: string,
): { kind: "url"; url: string } | { kind: "ignore" } {
  const trimmed = text.trim();
  if (!URL_PATTERN.test(trimmed)) {
    return { kind: "ignore" };
  }
  return { kind: "url", url: trimmed };
}

export function classifyDroppedOrPastedFile(file: { name: string; type: string }): PasteKind {
  if (isMediaMimeType(file.type) || isMediaExtension(file.name)) {
    return "ignore";
  }
  return "non-media-file";
}
