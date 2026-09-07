import type { App } from "obsidian";

type NamedBuffer = ArrayBuffer & { name: string };
type CopySource = File | NamedBuffer;

export function uniquePath(
  folder: string,
  fileName: string,
  exists: (path: string) => boolean,
): string {
  const dir = folder.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  const join = (name: string) => (dir ? `${dir}/${name}` : name);
  const first = join(fileName);
  if (!exists(first)) {
    return first;
  }
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";
  let n = 1;
  while (exists(join(`${base} ${n}${ext}`))) {
    n += 1;
  }
  return join(`${base} ${n}${ext}`);
}

function isBrowserFile(file: CopySource): file is File {
  return typeof File !== "undefined" && file instanceof File;
}

function fileNameOf(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

function normalizeFolder(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
}

function activeFileParent(app: App): string {
  const active = app.workspace.getActiveFile();
  if (!active) {
    return "";
  }
  if (active.parent?.path) {
    return active.parent.path;
  }
  const slash = active.path.lastIndexOf("/");
  return slash >= 0 ? active.path.slice(0, slash) : "";
}

function defaultAttachmentFolder(app: App): string {
  const vault = app.vault as App["vault"] & {
    getConfig?: (key: string) => unknown;
    config?: { attachmentFolderPath?: string };
  };
  const raw = vault.getConfig?.("attachmentFolderPath") ?? vault.config?.attachmentFolderPath;
  if (typeof raw !== "string" || raw === "" || raw === "/") {
    return "";
  }
  if (raw === "./" || raw.startsWith("./")) {
    const extra = raw === "./" ? "" : normalizeFolder(raw.slice(2));
    return [activeFileParent(app), extra].filter(Boolean).join("/");
  }
  return normalizeFolder(raw);
}

async function resolveAttachmentPath(app: App, fileName: string): Promise<string> {
  const getAvailable = app.fileManager?.getAvailablePathForAttachment;
  if (typeof getAvailable === "function") {
    const active = app.workspace.getActiveFile();
    return getAvailable.call(app.fileManager, fileName, active?.path);
  }
  return uniquePath(defaultAttachmentFolder(app), fileName, (path) =>
    Boolean(app.vault.getAbstractFileByPath(path)),
  );
}

export async function copyFileIntoAttachments(
  app: App,
  file: CopySource,
): Promise<{ path: string; fileName: string }> {
  const data = isBrowserFile(file) ? await file.arrayBuffer() : file;
  const path = await resolveAttachmentPath(app, file.name);
  await app.vault.createBinary(path, data);
  return { path, fileName: fileNameOf(path) };
}
