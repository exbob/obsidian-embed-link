import type { WebPageCardData } from "./serialize";

const LINE_RE = /^(\w+):\s*"(.*)"\s*$/;

function unescapeValue(value: string): string {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\\" && i + 1 < value.length) {
      result += value[i + 1];
      i++;
    } else {
      result += value[i];
    }
  }
  return result;
}

export function parseEmbedBlock(source: string): WebPageCardData | null {
  const fields: Record<string, string> = {};

  for (const line of source.trim().split("\n")) {
    const match = line.match(LINE_RE);
    if (!match) {
      continue;
    }
    fields[match[1]] = unescapeValue(match[2]);
  }

  if (
    fields.title === undefined ||
    fields.image === undefined ||
    fields.description === undefined ||
    fields.url === undefined
  ) {
    return null;
  }

  const data: WebPageCardData = {
    title: fields.title,
    image: fields.image,
    description: fields.description,
    url: fields.url,
  };

  if (fields.favicon) {
    data.favicon = fields.favicon;
  }

  if (fields.aspectRatio !== undefined) {
    const ratio = Number.parseFloat(fields.aspectRatio);
    if (!Number.isNaN(ratio)) {
      data.aspectRatio = ratio;
    }
  }

  return data;
}
