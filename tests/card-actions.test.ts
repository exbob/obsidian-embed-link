import { describe, it, expect, vi, beforeEach } from "vitest";
import { App, Notice, type PluginManifest } from "obsidian";
import { CARD_ACTION_ORDER } from "../src/embed/actions";
import { registerEmbedProcessor } from "../src/embed/processor";
import EmbedLinkPlugin from "../src/main";
import * as parsers from "../src/parsers";
import { DEFAULT_SETTINGS } from "../src/settings";
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

type ProcessorPlugin = EmbedLinkPlugin & {
  markdownProcessors: Array<{
    language: string;
    handler: (source: string, el: HTMLElement, ctx: unknown) => Promise<unknown> | void;
  }>;
};

function makePlugin(): ProcessorPlugin {
  const plugin = new EmbedLinkPlugin(new App(), MANIFEST) as ProcessorPlugin;
  plugin.settings = { ...DEFAULT_SETTINGS, cache: {} };
  return plugin;
}

function processEmbed(
  plugin: ProcessorPlugin,
  source: string,
  el: HTMLElement = document.createElement("div"),
): HTMLElement {
  registerEmbedProcessor(plugin);
  plugin.markdownProcessors[0].handler(source, el, {
    docId: "doc",
    sourcePath: "note.md",
    frontmatter: null,
    addChild: () => {},
    getSectionInfo: () => ({ text: source, lineStart: 0, lineEnd: 5 }),
  });
  return el;
}

const SAMPLE = `title: "Example"
image: "https://example.com/cover.png"
description: "Hello"
url: "https://example.com"
favicon: "https://example.com/favicon.ico"
aspectRatio: "1.5"`;

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("card actions", () => {
  beforeEach(() => {
    noticeLog().length = 0;
    document.body.replaceChildren();
  });

  it("orders bottom actions refresh, copy, delete", () => {
    expect(CARD_ACTION_ORDER).toEqual(["refresh", "copy", "delete"]);
  });

  it("maps bottom actions to embed-link- CSS class names", () => {
    expect(CARD_ACTION_ORDER.map((action) => `embed-link-${action}`)).toEqual([
      "embed-link-refresh",
      "embed-link-copy",
      "embed-link-delete",
    ]);
  });

  it("registers an embed markdown processor", () => {
    const plugin = makePlugin();
    registerEmbedProcessor(plugin);
    const processors = (plugin as unknown as { markdownProcessors: Array<{ language: string }> })
      .markdownProcessors;
    expect(processors).toHaveLength(1);
    expect(processors[0].language).toBe("embed");
  });

  it("renders bottom action buttons in refresh, copy, delete order", () => {
    const el = processEmbed(makePlugin(), SAMPLE);
    const bottom = el.querySelector(".embed-link-buttons");
    expect(bottom).not.toBeNull();
    const classes = [...bottom!.children].map((child) =>
      CARD_ACTION_ORDER.find((action) => child.classList.contains(`embed-link-${action}`)),
    );
    expect(classes).toEqual(["refresh", "copy", "delete"]);
    expect(el.querySelector(".embed-link-edit")).toBeNull();
    for (const child of bottom!.children) {
      expect(child.classList.contains("clickable-icon")).toBe(true);
      expect(child.tagName).toBe("DIV");
    }
  });

  it("shows favicon when showFavicon is on and a favicon is present", () => {
    const plugin = makePlugin();
    plugin.settings.showFavicon = true;
    const el = processEmbed(plugin, SAMPLE);
    const favicon = el.querySelector("img.embed-link-favicon") as HTMLImageElement | null;
    expect(favicon).not.toBeNull();
    expect(favicon?.src).toContain("favicon.ico");
  });

  it("hides favicon when showFavicon is off", () => {
    const plugin = makePlugin();
    plugin.settings.showFavicon = false;
    const el = processEmbed(plugin, SAMPLE);
    expect(el.querySelector("img.embed-link-favicon")).toBeNull();
  });

  it("registers the embed processor from plugin onload", async () => {
    const plugin = makePlugin();
    await plugin.onload();
    expect(plugin.markdownProcessors[0]?.language).toBe("embed");
  });

  it("notices and skips delete when block range is missing", async () => {
    const el = processEmbed(makePlugin(), SAMPLE);
    (el.querySelector(".embed-link-delete") as HTMLElement).click();
    (document.querySelector("button.mod-warning") as HTMLButtonElement).click();
    await flush();
    expect(el.querySelector(".embed-link-card")).not.toBeNull();
    expect(noticeLog()).toContain(t("notice.parseFailed", { detail: "missing block range" }));
  });

  it("deletes the local preview image when deleting a card", async () => {
    const plugin = makePlugin();
    plugin.settings.useCache = true;
    plugin.settings.cache = {
      "https://cdn.example/cover.png": "Test/attachments/cover.png",
    };
    const vault = plugin.app.vault as App["vault"] & {
      addExistingFile: (path: string) => { path: string };
      deletedPaths: string[];
    };
    const note = vault.addExistingFile("Test/index.md");
    vault.addExistingFile("Test/attachments/cover.png");
    const block = `\`\`\`embed
title: "Example"
image: "attachments/cover.png"
description: ""
url: "https://example.com"
\`\`\``;
    await plugin.app.vault.modify(note as never, `before\n${block}\nafter\n`);
    const source = `title: "Example"
image: "attachments/cover.png"
description: ""
url: "https://example.com"`;
    const el = document.createElement("div");
    registerEmbedProcessor(plugin);
    plugin.markdownProcessors[0].handler(source, el, {
      docId: "doc",
      sourcePath: "Test/index.md",
      frontmatter: null,
      addChild: () => {},
      getSectionInfo: () => ({ text: block, lineStart: 1, lineEnd: 6 }),
    });
    (el.querySelector(".embed-link-delete") as HTMLElement).click();
    expect(document.body.textContent).toContain(t("modal.deleteConfirm"));
    (document.querySelector("button.mod-warning") as HTMLButtonElement).click();
    await flush();
    await flush();
    expect(plugin.app.vault.getAbstractFileByPath("Test/attachments/cover.png")).toBeNull();
    expect(vault.deletedPaths).toContain("Test/attachments/cover.png");
    expect(await plugin.app.vault.read(note as never)).toBe("before\nafter\n");
    expect(plugin.settings.cache).toEqual({});
    expect(noticeLog()).toContain(t("notice.deleteConfirm"));
  });

  it("notices and skips refresh network when block range is missing", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl");
    try {
      const el = processEmbed(makePlugin(), SAMPLE);
      (el.querySelector(".embed-link-refresh") as HTMLElement).click();
      await flush();
      expect(parseSpy).not.toHaveBeenCalled();
      expect(noticeLog()).toContain(t("notice.parseFailed", { detail: "missing block range" }));
    } finally {
      parseSpy.mockRestore();
    }
  });
});
