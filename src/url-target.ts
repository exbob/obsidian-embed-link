import { classifyClipboardText } from "./paste/classify";

export function resolveUrlTarget(opts: {
  selection: string;
  cursorUrl: string | null;
  clipboard: string;
}): string | null {
  const selected = classifyClipboardText(opts.selection);
  if (selected.kind === "url") {
    return selected.url;
  }
  if (opts.cursorUrl) {
    const cursor = classifyClipboardText(opts.cursorUrl);
    if (cursor.kind === "url") {
      return cursor.url;
    }
  }
  const clip = classifyClipboardText(opts.clipboard);
  return clip.kind === "url" ? clip.url : null;
}

export function urlTokenAtCursor(line: string, ch: number): string | null {
  return urlTokenRangeAtCursor(line, ch)?.url ?? null;
}

export function urlTokenRangeAtCursor(
  line: string,
  ch: number,
): { url: string; from: number; to: number } | null {
  const clamped = Math.max(0, Math.min(ch, line.length));
  const before = line.slice(0, clamped);
  const start = before.search(/\S+$/);
  if (start === -1) {
    return null;
  }
  const after = line.slice(clamped);
  const rest = after.match(/^\S*/);
  const end = clamped + (rest ? rest[0].length : 0);
  const token = line.slice(start, end);
  const classified = classifyClipboardText(token);
  return classified.kind === "url" ? { url: classified.url, from: start, to: end } : null;
}
