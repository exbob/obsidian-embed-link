export interface WebPageCardData {
  title: string;
  image: string;
  description: string;
  url: string;
  favicon?: string;
  aspectRatio?: number;
}

export { parseEmbedBlock } from "./parse";

function quoteValue(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function serializeEmbedInner(data: WebPageCardData): string {
  const lines = [
    `title: ${quoteValue(data.title)}`,
    `image: ${quoteValue(data.image)}`,
    `description: ${quoteValue(data.description)}`,
    `url: ${quoteValue(data.url)}`,
  ];

  if (data.favicon) {
    lines.push(`favicon: ${quoteValue(data.favicon)}`);
  }

  if (data.aspectRatio !== undefined) {
    lines.push(`aspectRatio: ${quoteValue(String(data.aspectRatio))}`);
  }

  return lines.join("\n");
}

export function serializeEmbedBlock(data: WebPageCardData): string {
  return `\`\`\`embed\n${serializeEmbedInner(data)}\n\`\`\`\n`;
}
