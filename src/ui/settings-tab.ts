import { PluginSettingTab, Setting, type App } from "obsidian";
import { t } from "../i18n";
import type EmbedLinkPlugin from "../main";

export class EmbedLinkSettingTab extends PluginSettingTab {
  plugin: EmbedLinkPlugin;

  constructor(app: App, plugin: EmbedLinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.replaceChildren();

    new Setting(containerEl)
      .setName(t("setting.autoEmbed"))
      .setDesc(t("setting.autoEmbedDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoEmbed).onChange(async (value) => {
          this.plugin.settings.autoEmbed = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("setting.downloadImages"))
      .setDesc(t("setting.downloadImagesDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.downloadImages).onChange(async (value) => {
          this.plugin.settings.downloadImages = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("setting.imageFolderPath"))
      .setDesc(t("setting.imageFolderPathDesc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.imageFolderPath).onChange(async (value) => {
          this.plugin.settings.imageFolderPath = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("setting.keepAspectRatio"))
      .setDesc(t("setting.keepAspectRatioDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.keepAspectRatio).onChange(async (value) => {
          this.plugin.settings.keepAspectRatio = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("setting.useCache"))
      .setDesc(t("setting.useCacheDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useCache).onChange(async (value) => {
          this.plugin.settings.useCache = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("setting.showFavicon"))
      .setDesc(t("setting.showFaviconDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showFavicon).onChange(async (value) => {
          this.plugin.settings.showFavicon = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("setting.microlinkApiKey"))
      .setDesc(t("setting.microlinkApiKeyDesc"))
      .addText((text) =>
        text.setValue(this.plugin.settings.microlinkApiKey).onChange(async (value) => {
          this.plugin.settings.microlinkApiKey = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
