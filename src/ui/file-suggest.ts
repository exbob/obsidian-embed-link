import {
  EditorSuggest,
  Notice,
  type App,
  type Editor,
  type EditorPosition,
  type EditorSuggestTriggerInfo,
  type TFile,
} from "obsidian";
import type EmbedLinkPlugin from "../main";
import { t, type MessageKey } from "../i18n";
import { copyFileIntoAttachments } from "../files/copy";
import { formatFilenameWikiLink } from "../files/wiki-link";

export type FileMenuId = "filename-link" | "default-link";

export interface FileMenuItem {
  id: FileMenuId;
  key: MessageKey;
}

export const FILE_MENU_ITEMS: FileMenuItem[] = [
  { id: "filename-link", key: "fileMenu.filenameLink" },
  { id: "default-link", key: "fileMenu.defaultLink" },
];

export async function createDefaultAttachmentLink(app: App, file: File): Promise<string> {
  const sourcePath = app.workspace.getActiveFile()?.path ?? "";
  const destPath = await app.fileManager.getAvailablePathForAttachment(file.name, sourcePath);
  const created = await app.vault.createBinary(destPath, await file.arrayBuffer());
  return app.fileManager.generateMarkdownLink(created, sourcePath);
}

export async function applyFileMenuChoice(
  plugin: EmbedLinkPlugin,
  editor: Editor,
  file: File,
  id: FileMenuId,
): Promise<void> {
  try {
    if (id === "filename-link") {
      const copied = await copyFileIntoAttachments(plugin.app, file);
      editor.replaceSelection(formatFilenameWikiLink(copied.path, copied.fileName));
      return;
    }
    const link = await createDefaultAttachmentLink(plugin.app, file);
    editor.replaceSelection(link);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    new Notice(t("notice.parseFailed", { detail }));
  }
}

/** Kept for tests; paste UI uses Menu via paste-menu.ts. */
export class FileSuggest extends EditorSuggest<FileMenuItem> {
  private readonly plugin: EmbedLinkPlugin;
  private editor: Editor | null = null;
  private pendingFile: File | null = null;

  constructor(app: EmbedLinkPlugin["app"], plugin: EmbedLinkPlugin) {
    super(app);
    this.plugin = plugin;
  }

  arm(editor: Editor, file: File): void {
    this.editor = editor;
    this.pendingFile = file;
    const cursor = editor.getCursor();
    this.context = {
      editor,
      file: this.plugin.app.workspace.getActiveFile() as TFile,
      start: cursor,
      end: cursor,
      query: file.name,
    };
  }

  onTrigger(
    _cursor: EditorPosition,
    _editor: Editor,
    _file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    return null;
  }

  getSuggestions(): FileMenuItem[] {
    return FILE_MENU_ITEMS;
  }

  renderSuggestion(value: FileMenuItem, el: HTMLElement): void {
    el.textContent = t(value.key);
  }

  selectSuggestion(value: FileMenuItem): void {
    const editor = this.editor;
    const file = this.pendingFile;
    this.pendingFile = null;
    this.close();
    if (!editor || !file) {
      return;
    }
    void applyFileMenuChoice(this.plugin, editor, file, value.id);
  }
}
