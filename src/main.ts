import { Plugin } from "obsidian";
import { registerEmbedProcessor } from "./embed/processor";
import { registerPasteDropRouter } from "./paste/router";
import { DEFAULT_SETTINGS } from "./settings";
import type { EmbedLinkSettings } from "./types";

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
    registerEmbedProcessor(this);
    registerPasteDropRouter(this);
  }
}
