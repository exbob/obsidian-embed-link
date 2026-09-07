import { type App, TFile } from "obsidian";

/** Resolve an embed `image` field to a vault file (absolute or note-relative). */
export function resolveVaultImageFile(
  app: App,
  image: string,
  sourcePath: string,
): TFile | null {
  if (!image || /^(https?:|data:|app:)/i.test(image)) {
    return null;
  }
  const direct = app.vault.getAbstractFileByPath(image);
  if (direct instanceof TFile) {
    return direct;
  }
  const fromLink = app.metadataCache?.getFirstLinkpathDest?.(image, sourcePath);
  if (fromLink instanceof TFile) {
    return fromLink;
  }
  const slash = sourcePath.lastIndexOf("/");
  const noteDir = slash >= 0 ? sourcePath.slice(0, slash) : "";
  const joined = noteDir ? `${noteDir}/${image}` : image;
  const relative = app.vault.getAbstractFileByPath(joined);
  return relative instanceof TFile ? relative : null;
}

export type DeleteLocalImageResult = "deleted" | "skipped" | "failed";

/** Delete a local preview image; remote/data URLs are skipped. */
export async function deleteLocalEmbedImage(
  app: App,
  image: string,
  sourcePath: string,
): Promise<DeleteLocalImageResult> {
  const file = resolveVaultImageFile(app, image, sourcePath);
  if (!file) {
    return "skipped";
  }
  try {
    const trashFile = app.fileManager?.trashFile;
    if (typeof trashFile === "function") {
      await trashFile.call(app.fileManager, file);
    } else {
      await app.vault.delete(file);
    }
    return "deleted";
  } catch {
    return "failed";
  }
}
