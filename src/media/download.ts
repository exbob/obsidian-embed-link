import { requestUrl as defaultRequestUrl, type App, type Vault } from "obsidian";
import type { EmbedLinkSettings } from "../types";

export function normalizeFolder(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
}

function joinPath(folder: string, fileName: string): string {
  const dir = normalizeFolder(folder);
  return dir ? `${dir}/${fileName}` : fileName;
}

function splitFileName(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return { base: fileName, ext: "" };
  }
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot) };
}

export function uniqueFilePath(vault: Vault, folderPath: string, fileName: string): string {
  const folder = normalizeFolder(folderPath);
  const first = joinPath(folder, fileName);
  if (!vault.getAbstractFileByPath(first)) {
    return first;
  }
  const { base, ext } = splitFileName(fileName);
  let n = 1;
  while (vault.getAbstractFileByPath(joinPath(folder, `${base} ${n}${ext}`))) {
    n += 1;
  }
  return joinPath(folder, `${base} ${n}${ext}`);
}

export function fileNameFromImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    if (last && last.includes(".")) {
      return last.replace(/[<>:"/\\|?*]/g, "_");
    }
  } catch {
    // fall through to default
  }
  return "image.png";
}

function getObsidianAttachmentFolder(app?: App): string {
  if (!app) {
    return "";
  }
  const vault = app.vault as Vault & {
    getConfig?: (key: string) => unknown;
    config?: { attachmentFolderPath?: string };
  };
  const raw = vault.getConfig?.("attachmentFolderPath") ?? vault.config?.attachmentFolderPath;
  if (typeof raw !== "string" || raw === "" || raw === "/") {
    return "";
  }
  if (raw === "./" || raw.startsWith("./")) {
    const extra = raw === "./" ? "" : normalizeFolder(raw.slice(2));
    const workspace = (
      app as App & {
        workspace?: {
          getActiveFile?: () => { parent?: { path: string } | null; path: string } | null;
        };
      }
    ).workspace;
    const active = workspace?.getActiveFile?.();
    let parent = "";
    if (active?.parent?.path) {
      parent = active.parent.path;
    } else if (active?.path) {
      const slash = active.path.lastIndexOf("/");
      parent = slash >= 0 ? active.path.slice(0, slash) : "";
    }
    return [parent, extra].filter(Boolean).join("/");
  }
  return normalizeFolder(raw);
}

export function resolveImageFolderPath(settings: EmbedLinkSettings, app?: App): string {
  const configured = settings.imageFolderPath.trim();
  if (configured) {
    return normalizeFolder(configured);
  }
  return getObsidianAttachmentFolder(app);
}

function isAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
}

async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
  const folder = normalizeFolder(folderPath);
  if (!folder) {
    return;
  }
  const parts = folder.split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (vault.getAbstractFileByPath(current)) {
      continue;
    }
    try {
      await vault.createFolder(current);
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }
  }
}

export async function downloadImageToVault(
  url: string,
  vault: Vault,
  folderPath: string,
  requestUrlFn: typeof defaultRequestUrl = defaultRequestUrl,
): Promise<string> {
  if (!url || url.startsWith("data:") || !/^https?:\/\//i.test(url)) {
    return url;
  }

  await ensureFolder(vault, folderPath);

  const dest = uniqueFilePath(vault, normalizeFolder(folderPath), fileNameFromImageUrl(url));
  const response = await requestUrlFn({ url });
  await vault.createBinary(dest, response.arrayBuffer);
  return dest;
}
