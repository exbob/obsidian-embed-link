import { requestUrl as defaultRequestUrl, type TFile, type Vault } from "obsidian";

export interface AspectRatioDeps {
  requestUrl?: typeof defaultRequestUrl;
  vault?: Vault;
}

export async function getAspectRatio(
  imageUrlOrPath: string,
  cache: Record<string, unknown>,
  deps: AspectRatioDeps = {},
): Promise<number | undefined> {
  const cached = cache[imageUrlOrPath];
  if (typeof cached === "number" && Number.isFinite(cached) && cached > 0) {
    return cached;
  }

  try {
    const bytes = await readImageBytes(imageUrlOrPath, deps);
    if (!bytes) {
      return undefined;
    }
    const size = parseImageSize(new Uint8Array(bytes));
    if (!size || size.height === 0) {
      return undefined;
    }
    const ratio = size.width / size.height;
    cache[imageUrlOrPath] = ratio;
    return ratio;
  } catch {
    return undefined;
  }
}

async function readImageBytes(
  imageUrlOrPath: string,
  deps: AspectRatioDeps,
): Promise<ArrayBuffer | undefined> {
  if (imageUrlOrPath.startsWith("data:")) {
    return decodeDataUrl(imageUrlOrPath);
  }
  if (/^https?:\/\//i.test(imageUrlOrPath)) {
    const fetch = deps.requestUrl ?? defaultRequestUrl;
    const response = await fetch({ url: imageUrlOrPath });
    return response.arrayBuffer;
  }
  if (!deps.vault) {
    return undefined;
  }
  const file = deps.vault.getAbstractFileByPath(imageUrlOrPath);
  if (!file) {
    return undefined;
  }
  return deps.vault.readBinary(file as TFile);
}

function decodeDataUrl(url: string): ArrayBuffer | undefined {
  const match = /^data:[^;]+;base64,(.+)$/i.exec(url);
  if (!match) {
    return undefined;
  }
  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function parseImageSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  return parsePngSize(bytes) ?? parseGifSize(bytes) ?? parseJpegSize(bytes);
}

function parsePngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 24) {
    return undefined;
  }
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width > 0 && height > 0) {
    return { width, height };
  }
  return undefined;
}

function parseGifSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 10) {
    return undefined;
  }
  const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
  if (header !== "GIF87a" && header !== "GIF89a") {
    return undefined;
  }
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width > 0 && height > 0) {
    return { width, height };
  }
  return undefined;
}

function parseJpegSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return undefined;
  }
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width > 0 && height > 0) {
        return { width, height };
      }
      return undefined;
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) {
      return undefined;
    }
    offset += 2 + length;
  }
  return undefined;
}
