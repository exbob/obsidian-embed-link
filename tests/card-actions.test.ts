import { describe, it, expect } from "vitest";
import { App, type PluginManifest } from "obsidian";
import { CARD_ACTION_ORDER } from "../src/embed/actions";
import { registerEmbedProcessor } from "../src/embed/processor";
import EmbedLinkPlugin from "../src/main";
import { DEFAULT_SETTINGS } from "../src/settings";

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

describe("card actions", () => {
  it("orders bottom actions delete, copy, refresh", () => {
    expect(CARD_ACTION_ORDER).toEqual(["delete", "copy", "refresh"]);
  });

  it("maps bottom actions to embed-link- CSS class names", () => {
    expect(CARD_ACTION_ORDER.map((action) => `embed-link-${action}`)).toEqual([
      "embed-link-delete",
      "embed-link-copy",
      "embed-link-refresh",
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

  it("renders bottom action buttons in delete, copy, refresh order", () => {
    const el = processEmbed(makePlugin(), SAMPLE);
    const bottom = el.querySelector(".embed-link-buttons");
    expect(bottom).not.toBeNull();
    const classes = [...bottom!.children].map((child) =>
      CARD_ACTION_ORDER.find((action) => child.classList.contains(`embed-link-${action}`)),
    );
    expect(classes).toEqual(["delete", "copy", "refresh"]);
    expect(el.querySelector(".embed-link-edit")).not.toBeNull();
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
});
