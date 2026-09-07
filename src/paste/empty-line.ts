export function isEmptyEditorLine(
  lineText: string,
  cursorCh: number,
  insertedLength: number,
): boolean {
  const startCh = cursorCh - insertedLength;
  return startCh === 0 && lineText.slice(0, startCh).trim() === "";
}
