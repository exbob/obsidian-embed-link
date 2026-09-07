export function formatFilenameWikiLink(path: string, fileNameWithExt: string): string {
  return `[[${path}|${fileNameWithExt}]]`;
}
