import { Platform, type Editor } from "obsidian";
import type EmbedLinkPlugin from "../main";
import { copyFileIntoAttachments } from "../files/copy";
import { formatFilenameWikiLink } from "../files/wiki-link";
import { classifyClipboardText, classifyDroppedOrPastedFile } from "./classify";
import { decideUrlPaste } from "./decide";
import { FileSuggest, createDefaultAttachmentLink } from "../ui/file-suggest";
import { UrlSuggest } from "../ui/url-suggest";

export { createDefaultAttachmentLink };

export function registerPasteDropRouter(plugin: EmbedLinkPlugin): void {
  const urlSuggest = new UrlSuggest(plugin.app, plugin);
  const fileSuggest = new FileSuggest(plugin.app, plugin);
  plugin.registerEditorSuggest(urlSuggest);
  plugin.registerEditorSuggest(fileSuggest);

  plugin.registerEvent(
    plugin.app.workspace.on("editor-paste", (evt: ClipboardEvent, editor: Editor) => {
      void handleEditorEvent(plugin, evt, editor, fileSuggest);
    }),
  );

  if (!Platform.isMobile) {
    plugin.registerEvent(
      plugin.app.workspace.on("editor-drop", (evt: DragEvent, editor: Editor) => {
        void handleEditorEvent(plugin, evt, editor, fileSuggest);
      }),
    );
  }
}

async function handleEditorEvent(
  plugin: EmbedLinkPlugin,
  evt: ClipboardEvent | DragEvent,
  editor: Editor,
  fileSuggest: FileSuggest,
): Promise<void> {
  if (evt.defaultPrevented) {
    return;
  }
  const data = transferData(evt);
  if (!data) {
    return;
  }

  const files = collectFiles(data.files);
  if (files.length > 1) {
    return;
  }
  if (files.length === 1) {
    await handleFile(plugin, evt, editor, files[0], fileSuggest);
    return;
  }

  const text = readText(data);
  const classified = classifyClipboardText(text);
  if (classified.kind !== "url") {
    return;
  }
  const emptyLine = editor.getLine(editor.getCursor().line).trim() === "";
  const action = decideUrlPaste({
    autoEmbed: plugin.settings.autoEmbed,
    emptyLine,
  });
  if (action.type === "ignore") {
    return;
  }
  plugin.pasteInfo.trigger = true;
  plugin.pasteInfo.text = classified.url;
}

async function handleFile(
  plugin: EmbedLinkPlugin,
  evt: ClipboardEvent | DragEvent,
  editor: Editor,
  file: File,
  fileSuggest: FileSuggest,
): Promise<void> {
  if (classifyDroppedOrPastedFile(file) !== "non-media-file") {
    return;
  }
  evt.preventDefault();
  if (plugin.settings.autoEmbed) {
    const copied = await copyFileIntoAttachments(plugin.app, file);
    editor.replaceSelection(formatFilenameWikiLink(copied.path, copied.fileName));
    return;
  }
  fileSuggest.arm(editor, file);
  fileSuggest.open();
}

function transferData(evt: ClipboardEvent | DragEvent): DataTransfer | null {
  if ("clipboardData" in evt && evt.clipboardData) {
    return evt.clipboardData;
  }
  if ("dataTransfer" in evt && evt.dataTransfer) {
    return evt.dataTransfer;
  }
  return null;
}

function readText(data: DataTransfer): string {
  const plain = data.getData("text/plain")?.trim() ?? "";
  if (plain) {
    return plain;
  }
  const uriList = data.getData("text/uri-list") ?? "";
  for (const line of uriList.split(/\r?\n/)) {
    const row = line.trim();
    if (row !== "" && !row.startsWith("#")) {
      return row;
    }
  }
  return "";
}

function collectFiles(list: FileList | null | undefined): File[] {
  if (!list || list.length === 0) {
    return [];
  }
  const files: File[] = [];
  for (let i = 0; i < list.length; i++) {
    const file = list.item(i) ?? list[i];
    if (file) {
      files.push(file);
    }
  }
  return files;
}
