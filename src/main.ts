import { Plugin } from "obsidian";
import { registerEmbedProcessor } from "./embed/processor";
import { DEFAULT_SETTINGS } from "./settings";
import type { EmbedLinkSettings } from "./types";

export default class EmbedLinkPlugin extends Plugin {
  settings: EmbedLinkSettings = { ...DEFAULT_SETTINGS, cache: {} };

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async onload(): Promise<void> {
    registerEmbedProcessor(this);
  }
}
