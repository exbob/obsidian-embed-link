import {
  EditorSuggest,
  Notice,
  type Editor,
  type EditorPosition,
  type EditorSuggestTriggerInfo,
  type TFile,
} from "obsidian";
import type EmbedLinkPlugin from "../main";
import { t, type MessageKey } from "../i18n";
import { formatMarkdownLink, formatVideoPreview, titleOrHostname } from "../embed/formats";
import { serializeEmbedBlock } from "../embed/serialize";
import { parseUrl } from "../parsers";

export type UrlMenuId = "web-page-card" | "video-preview" | "markdown-link" | "plain-text";

export interface UrlMenuItem {
  id: UrlMenuId;
  key: MessageKey;
}

export const URL_MENU_ITEMS: UrlMenuItem[] = [
  { id: "web-page-card", key: "urlMenu.webPageCard" },
  { id: "video-preview", key: "urlMenu.videoPreview" },
  { id: "markdown-link", key: "urlMenu.markdownLink" },
  { id: "plain-text", key: "urlMenu.plainText" },
];

export class UrlSuggest extends EditorSuggest<UrlMenuItem> {
  private readonly plugin: EmbedLinkPlugin;
  private editor: Editor | null = null;

  constructor(app: EmbedLinkPlugin["app"], plugin: EmbedLinkPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    if (!this.plugin.pasteInfo.trigger) {
      return null;
    }
    this.plugin.pasteInfo.trigger = false;
    this.editor = editor;
    const url = this.plugin.pasteInfo.text;
    if (this.plugin.settings.autoEmbed) {
      void this.replacePastedUrl(editor, url, "web-page-card");
      return null;
    }
    return { start: cursor, end: cursor, query: url };
  }

  getSuggestions(): UrlMenuItem[] {
    return URL_MENU_ITEMS;
  }

  renderSuggestion(value: UrlMenuItem, el: HTMLElement): void {
    el.textContent = t(value.key);
  }

  selectSuggestion(value: UrlMenuItem): void {
    const editor = this.editor;
    const url = this.plugin.pasteInfo.text;
    this.close();
    if (!editor || value.id === "plain-text") {
      return;
    }
    void this.replacePastedUrl(editor, url, value.id);
  }

  private async replacePastedUrl(editor: Editor, url: string, id: UrlMenuId): Promise<void> {
    const cursor = editor.getCursor();
    const start = { line: cursor.line, ch: Math.max(0, cursor.ch - url.length) };
    const end = cursor;
    if (id === "web-page-card") {
      try {
        const data = await parseUrl(url, {
          settings: this.plugin.settings,
          vault: this.plugin.app.vault,
          app: this.plugin.app,
          persistCache: () => this.plugin.saveSettings(),
        });
        editor.replaceRange(serializeEmbedBlock(data), start, end);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        new Notice(t("notice.parseFailed", { detail }));
      }
      return;
    }
    let title = "";
    try {
      const data = await parseUrl(url, {
        settings: this.plugin.settings,
        vault: this.plugin.app.vault,
        app: this.plugin.app,
        persistCache: () => this.plugin.saveSettings(),
      });
      title = data.title;
    } catch {
      // fall through to hostname
    }
    const display = titleOrHostname(title, url);
    const text =
      id === "video-preview" ? formatVideoPreview(display, url) : formatMarkdownLink(display, url);
    editor.replaceRange(text, start, end);
  }
}
