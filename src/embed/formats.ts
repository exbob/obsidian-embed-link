function sanitizeMarkdownTitle(title: string): string {
  return title.replace(/[\[\]]/g, " ");
}

export function formatVideoPreview(title: string, url: string): string {
  return `![${sanitizeMarkdownTitle(title)}](${url})`;
}

export function formatMarkdownLink(title: string, url: string): string {
  return `[${sanitizeMarkdownTitle(title)}](${url})`;
}

export function titleOrHostname(title: string, url: string): string {
  if (title.trim()) {
    return title;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
