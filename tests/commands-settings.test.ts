import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App, Notice, type PluginManifest } from "obsidian";
import EmbedLinkPlugin from "../src/main";
import { EmbedLinkSettingTab } from "../src/ui/settings-tab";
import { DEFAULT_SETTINGS } from "../src/settings";
import * as parsers from "../src/parsers";
import { serializeEmbedBlock, type WebPageCardData } from "../src/embed/serialize";
import { t } from "../src/i18n";

type NoticeWithLog = typeof Notice & { messages: string[] };

function noticeLog(): string[] {
  return (Notice as NoticeWithLog).messages;
}

const MANIFEST: PluginManifest = {
  id: "embed-link",
  name: "Embed Link",
  author: "test",
  version: "0.1.0",
  minAppVersion: "1.7.2",
  description: "",
};

type TestPlugin = EmbedLinkPlugin & {
  commands: Array<{
    id: string;
    name: string;
    editorCallback?: (editor: unknown) => unknown;
    callback?: () => unknown;
  }>;
  settingTabs: unknown[];
  editorSuggests: unknown[];
  persistedData: unknown;
  markdownProcessors: Array<{ language: string }>;
  registeredEvents: Array<{ name: string }>;
};

function makePlugin(): TestPlugin {
  return new EmbedLinkPlugin(new App(), MANIFEST) as TestPlugin;
}

function makeEditor(line: string, ch: number, selection = "") {
  let cursor = { line: 0, ch };
  let current = line;
  let selected = selection;
  return {
    getCursor: () => ({ ...cursor }),
    getLine: () => current,
    getSelection: () => selected,
    replaceSelection: vi.fn((text: string) => {
      selected = "";
      current = text;
      cursor = { line: 0, ch: text.length };
    }),
    replaceRange: vi.fn((text: string, from: { ch: number }, to?: { ch: number }) => {
      const end = to ?? from;
      current = current.slice(0, from.ch) + text + current.slice(end.ch);
      cursor = { line: 0, ch: from.ch + text.length };
    }),
  };
}

const CARD: WebPageCardData = {
  title: "Example",
  image: "https://example.com/img.png",
  description: "Hello",
  url: "https://example.com",
};

describe("plugin onload wiring", () => {
  it("loads normalized settings including cache before registering features", async () => {
    const plugin = makePlugin();
    plugin.persistedData = {
      autoEmbed: true,
      cache: { "https://cached": 1.5 },
    };
    await plugin.onload();
    expect(plugin.settings.autoEmbed).toBe(true);
    expect(plugin.settings.downloadImages).toBe(false);
    expect(plugin.settings.cache).toEqual({ "https://cached": 1.5 });
    expect(plugin.markdownProcessors[0]?.language).toBe("embed");
    expect(plugin.registeredEvents.map((event) => event.name)).toEqual([
      "editor-paste",
      "editor-drop",
    ]);
    expect(plugin.editorSuggests).toHaveLength(2);
    expect(plugin.commands.map((command) => command.id)).toEqual([
      "create-web-page-card",
      "create-web-page-card-local",
      "create-web-page-card-microlink",
    ]);
    expect(plugin.commands.map((command) => command.name)).toEqual([
      t("command.createWebPageCard"),
      t("command.createWebPageCardLocal"),
      t("command.createWebPageCardMicrolink"),
    ]);
    expect(plugin.settingTabs).toHaveLength(1);
    expect(plugin.settingTabs[0]).toBeInstanceOf(EmbedLinkSettingTab);
  });
});

describe("saveSettings", () => {
  it("persists settings including cache", async () => {
    const plugin = makePlugin();
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      autoEmbed: true,
      cache: { "https://img": 1.2 },
    };
    await plugin.saveSettings();
    expect(plugin.persistedData).toEqual(plugin.settings);
    expect((plugin.persistedData as { cache: unknown }).cache).toEqual({
      "https://img": 1.2,
    });
  });
});

describe("embed commands", () => {
  beforeEach(() => {
    noticeLog().length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a web page card from a selected URL using fallback parse", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl").mockResolvedValue(CARD);
    const forcedSpy = vi.spyOn(parsers, "parseUrlWith");
    const plugin = makePlugin();
    await plugin.onload();
    const editor = makeEditor("https://example.com", 19, "https://example.com");
    const command = plugin.commands.find((item) => item.id === "create-web-page-card");
    await command?.editorCallback?.(editor);
    expect(parseSpy).toHaveBeenCalled();
    expect(forcedSpy).not.toHaveBeenCalled();
    const options = parseSpy.mock.calls[0][1];
    expect(typeof options.persistCache).toBe("function");
    await options.persistCache?.();
    expect(plugin.persistedData).toEqual(plugin.settings);
    expect(editor.replaceSelection).toHaveBeenCalledWith(serializeEmbedBlock(CARD));
  });

  it("uses the cursor URL token when selection is not a URL", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl").mockResolvedValue(CARD);
    vi.stubGlobal("navigator", {
      clipboard: { readText: async () => "https://c.com" },
    });
    const plugin = makePlugin();
    await plugin.onload();
    const line = "see https://b.com please";
    const editor = makeEditor(line, "see https://b.com".length, "");
    const command = plugin.commands.find((item) => item.id === "create-web-page-card");
    await command?.editorCallback?.(editor);
    expect(parseSpy).toHaveBeenCalledWith("https://b.com", expect.anything());
    expect(editor.replaceRange).toHaveBeenCalled();
    const [text, start, end] = editor.replaceRange.mock.calls[0];
    expect(text).toBe(serializeEmbedBlock(CARD));
    expect(start).toEqual({ line: 0, ch: "see ".length });
    expect(end).toEqual({ line: 0, ch: "see https://b.com".length });
  });

  it("falls back to clipboard text when selection and cursor are not URLs", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl").mockResolvedValue({
      ...CARD,
      url: "https://c.com",
    });
    vi.stubGlobal("navigator", {
      clipboard: { readText: async () => "https://c.com" },
    });
    const plugin = makePlugin();
    await plugin.onload();
    const editor = makeEditor("hello", 5, "nope");
    const command = plugin.commands.find((item) => item.id === "create-web-page-card");
    await command?.editorCallback?.(editor);
    expect(parseSpy).toHaveBeenCalledWith("https://c.com", expect.anything());
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      serializeEmbedBlock({ ...CARD, url: "https://c.com" }),
    );
  });

  it("forces local parser with no fallback and notices on failure", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl");
    const forcedSpy = vi
      .spyOn(parsers, "parseUrlWith")
      .mockRejectedValue(new Error("local down"));
    const plugin = makePlugin();
    await plugin.onload();
    const editor = makeEditor("https://example.com", 19, "https://example.com");
    const command = plugin.commands.find((item) => item.id === "create-web-page-card-local");
    await command?.editorCallback?.(editor);
    expect(forcedSpy).toHaveBeenCalledWith("local", "https://example.com", expect.anything());
    expect(parseSpy).not.toHaveBeenCalled();
    expect(noticeLog()).toContain(t("notice.parseFailed", { detail: "local down" }));
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("forces microlink parser with no fallback", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl");
    const forcedSpy = vi.spyOn(parsers, "parseUrlWith").mockResolvedValue(CARD);
    const plugin = makePlugin();
    await plugin.onload();
    const editor = makeEditor("https://example.com", 19, "https://example.com");
    const command = plugin.commands.find((item) => item.id === "create-web-page-card-microlink");
    await command?.editorCallback?.(editor);
    expect(forcedSpy).toHaveBeenCalledWith(
      "microlink",
      "https://example.com",
      expect.anything(),
    );
    expect(parseSpy).not.toHaveBeenCalled();
    expect(editor.replaceSelection).toHaveBeenCalledWith(serializeEmbedBlock(CARD));
  });
});

describe("settings tab", () => {
  it("exposes every user-facing setting and saves on change", async () => {
    const plugin = makePlugin();
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      autoEmbed: true,
      imageFolderPath: "embeds",
      microlinkApiKey: "key",
      cache: { keep: 1 },
    };
    const tab = new EmbedLinkSettingTab(plugin.app, plugin);
    tab.display();

    const instances = collectSettings(tab.containerEl);
    expect(instances.map((item) => item.nameEl.textContent)).toEqual([
      t("setting.autoEmbed"),
      t("setting.downloadImages"),
      t("setting.imageFolderPath"),
      t("setting.keepAspectRatio"),
      t("setting.useCache"),
      t("setting.showFavicon"),
      t("setting.microlinkApiKey"),
    ]);

    const autoEmbed = instances.find((item) => item.nameEl.textContent === t("setting.autoEmbed"));
    expect(autoEmbed?.toggles[0].value).toBe(true);
    await autoEmbed?.toggles[0].changeHandler?.(false);
    expect(plugin.settings.autoEmbed).toBe(false);

    const path = instances.find(
      (item) => item.nameEl.textContent === t("setting.imageFolderPath"),
    );
    expect(path?.texts[0].value).toBe("embeds");
    await path?.texts[0].changeHandler?.("covers");
    expect(plugin.settings.imageFolderPath).toBe("covers");

    const key = instances.find(
      (item) => item.nameEl.textContent === t("setting.microlinkApiKey"),
    );
    expect(key?.texts[0].value).toBe("key");
    await key?.texts[0].changeHandler?.("new-key");
    expect(plugin.settings.microlinkApiKey).toBe("new-key");

    expect(plugin.settings.cache).toEqual({ keep: 1 });
    expect(plugin.persistedData).toMatchObject({
      autoEmbed: false,
      imageFolderPath: "covers",
      microlinkApiKey: "new-key",
      cache: { keep: 1 },
    });
  });
});

interface StubSetting {
  nameEl: HTMLElement;
  toggles: Array<{
    value: boolean;
    changeHandler: ((value: boolean) => unknown) | null;
  }>;
  texts: Array<{
    value: string;
    changeHandler: ((value: string) => unknown) | null;
  }>;
}

function collectSettings(containerEl: HTMLElement): StubSetting[] {
  return [...containerEl.children].map((child) => {
    const record = child as HTMLElement & { _setting?: StubSetting };
    if (!record._setting) {
      throw new Error("missing Setting instance");
    }
    return record._setting;
  });
}
