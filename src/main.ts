import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";
import type { EmbedLinkSettings } from "./types";

export default class EmbedLinkPlugin extends Plugin {
  settings: EmbedLinkSettings = { ...DEFAULT_SETTINGS, cache: {} };

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async onload(): Promise<void> {
    // Wired in later tasks. Call saveSettings() after parse mutates settings.cache.
  }
}
