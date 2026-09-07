import { Notice, Plugin, type Editor } from "obsidian";
import { registerEmbedProcessor } from "./embed/processor";
import { serializeEmbedBlock, type WebPageCardData } from "./embed/serialize";
import { t } from "./i18n";
import { parseUrl, parseUrlWith, type ParserName } from "./parsers";
import { registerPasteDropRouter } from "./paste/router";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import type { EmbedLinkSettings } from "./types";
import { EmbedLinkSettingTab } from "./ui/settings-tab";
import { resolveUrlTarget, urlTokenRangeAtCursor } from "./url-target";

export interface PasteInfo {
  trigger: boolean;
  text: string;
}

export default class EmbedLinkPlugin extends Plugin {
  settings: EmbedLinkSettings = { ...DEFAULT_SETTINGS, cache: {} };
  pasteInfo: PasteInfo = { trigger: false, text: "" };

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    registerEmbedProcessor(this);
    registerPasteDropRouter(this);
    this.registerCommands();
    this.addSettingTab(new EmbedLinkSettingTab(this.app, this));
  }

  private registerCommands(): void {
    this.addCommand({
      id: "create-web-page-card",
      name: t("command.createWebPageCard"),
      editorCallback: (editor) => this.createWebPageCard(editor),
    });
    this.addCommand({
      id: "create-web-page-card-local",
      name: t("command.createWebPageCardLocal"),
      editorCallback: (editor) => this.createWebPageCard(editor, "local"),
    });
    this.addCommand({
      id: "create-web-page-card-microlink",
      name: t("command.createWebPageCardMicrolink"),
      editorCallback: (editor) => this.createWebPageCard(editor, "microlink"),
    });
  }

  private async createWebPageCard(editor: Editor, parser?: ParserName): Promise<void> {
    const url = await this.resolveCommandUrl(editor);
    if (!url) {
      new Notice(t("notice.parseFailed", { detail: "no URL" }));
      return;
    }
    const options = {
      settings: this.settings,
      vault: this.app.vault,
      app: this.app,
      sourcePath: this.app.workspace.getActiveFile()?.path,
      persistCache: () => this.saveSettings(),
    };
    try {
      const data = parser
        ? await parseUrlWith(parser, url, options)
        : await parseUrl(url, options);
      this.insertEmbed(editor, url, data);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      new Notice(t("notice.parseFailed", { detail }));
    }
  }

  private async resolveCommandUrl(editor: Editor): Promise<string | null> {
    const selection = editor.getSelection();
    const cursor = editor.getCursor();
    const token = urlTokenRangeAtCursor(editor.getLine(cursor.line), cursor.ch);
    let clipboard = "";
    try {
      clipboard = await navigator.clipboard.readText();
    } catch {
      clipboard = "";
    }
    return resolveUrlTarget({
      selection,
      cursorUrl: token?.url ?? null,
      clipboard,
    });
  }

  private insertEmbed(editor: Editor, url: string, data: WebPageCardData): void {
    const block = serializeEmbedBlock(data);
    const selection = editor.getSelection();
    if (resolveUrlTarget({ selection, cursorUrl: null, clipboard: "" }) === url) {
      editor.replaceSelection(block);
      return;
    }
    const cursor = editor.getCursor();
    const token = urlTokenRangeAtCursor(editor.getLine(cursor.line), cursor.ch);
    if (token?.url === url) {
      editor.replaceRange(
        block,
        { line: cursor.line, ch: token.from },
        { line: cursor.line, ch: token.to },
      );
      return;
    }
    editor.replaceSelection(block);
  }
}
