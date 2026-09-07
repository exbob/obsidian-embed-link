import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { App, Notice, Platform, type PluginManifest } from "obsidian";
import EmbedLinkPlugin from "../src/main";
import { DEFAULT_SETTINGS } from "../src/settings";
import { registerPasteDropRouter, createDefaultAttachmentLink } from "../src/paste/router";
import { URL_MENU_ITEMS, UrlSuggest } from "../src/ui/url-suggest";
import { FILE_MENU_ITEMS, FileSuggest } from "../src/ui/file-suggest";
import * as parsers from "../src/parsers";
import { serializeEmbedBlock } from "../src/embed/serialize";
import { t } from "../src/i18n";
import type { TFile } from "obsidian";

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
  registeredEvents: Array<{ name: string }>;
  editorSuggests: unknown[];
};

type WorkspaceApp = App & {
  workspace: {
    activeFile: { path: string } | null;
    getActiveFile: () => { path: string } | null;
    trigger: (name: string, ...args: unknown[]) => void;
  };
};

function makePlugin(): TestPlugin {
  const plugin = new EmbedLinkPlugin(new App(), MANIFEST) as TestPlugin;
  plugin.settings = { ...DEFAULT_SETTINGS, cache: {} };
  return plugin;
}

function makeEditor(line: string, ch: number) {
  let cursor = { line: 0, ch };
  let current = line;
  return {
    getCursor: () => ({ ...cursor }),
    setCursor: (pos: { line: number; ch: number }) => {
      cursor = { ...pos };
    },
    getLine: () => current,
    setLine: (text: string) => {
      current = text;
    },
    replaceRange: vi.fn((text: string, from: { ch: number }, to?: { ch: number }) => {
      const end = to ?? from;
      current = current.slice(0, from.ch) + text + current.slice(end.ch);
      cursor = { line: 0, ch: from.ch + text.length };
    }),
    replaceSelection: vi.fn((text: string) => {
      current = text;
      cursor = { line: 0, ch: text.length };
    }),
  };
}

function clipboardEvent(text: string, files: File[] = []) {
  const preventDefault = vi.fn();
  const fileList: { length: number; item: (i: number) => File | null; [index: number]: File } = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
  };
  files.forEach((file, index) => {
    fileList[index] = file;
  });
  return {
    preventDefault,
    defaultPrevented: false,
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
      files: fileList,
    },
    dataTransfer: null,
  };
}

describe("URL and file suggest menus", () => {
  it("orders URL choices as web page card, video preview, markdown link, plain text", () => {
    expect(URL_MENU_ITEMS.map((item) => item.key)).toEqual([
      "urlMenu.webPageCard",
      "urlMenu.videoPreview",
      "urlMenu.markdownLink",
      "urlMenu.plainText",
    ]);
    const plugin = makePlugin();
    const suggest = new UrlSuggest(plugin.app, plugin);
    const labels = suggest.getSuggestions().map((item) => t(item.key));
    expect(labels).toEqual([
      t("urlMenu.webPageCard"),
      t("urlMenu.videoPreview"),
      t("urlMenu.markdownLink"),
      t("urlMenu.plainText"),
    ]);
  });

  it("orders file choices as filename link then default link", () => {
    expect(FILE_MENU_ITEMS.map((item) => item.key)).toEqual([
      "fileMenu.filenameLink",
      "fileMenu.defaultLink",
    ]);
    const plugin = makePlugin();
    const suggest = new FileSuggest(plugin.app, plugin);
    expect(suggest.getSuggestions().map((item) => item.key)).toEqual([
      "fileMenu.filenameLink",
      "fileMenu.defaultLink",
    ]);
  });
});

describe("registerPasteDropRouter", () => {
  beforeEach(() => {
    noticeLog().length = 0;
    Platform.isMobile = false;
  });

  afterEach(() => {
    Platform.isMobile = false;
    vi.restoreAllMocks();
  });

  it("registers paste and drop on desktop", () => {
    Platform.isMobile = false;
    const plugin = makePlugin();
    registerPasteDropRouter(plugin);
    expect(plugin.registeredEvents.map((event) => event.name)).toEqual([
      "editor-paste",
      "editor-drop",
    ]);
    expect(plugin.editorSuggests).toHaveLength(2);
  });

  it("registers paste only on mobile", () => {
    Platform.isMobile = true;
    const plugin = makePlugin();
    registerPasteDropRouter(plugin);
    expect(plugin.registeredEvents.map((event) => event.name)).toEqual(["editor-paste"]);
  });

  it("ignores a URL pasted on a non-empty line", () => {
    const plugin = makePlugin();
    registerPasteDropRouter(plugin);
    const editor = makeEditor("hello", 5);
    const evt = clipboardEvent("https://example.com");
    (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
    expect(plugin.pasteInfo.trigger).toBe(false);
    expect(evt.preventDefault).not.toHaveBeenCalled();
  });

  it("inserts the trimmed URL so pasteInfo.text matches the editor", () => {
    const plugin = makePlugin();
    plugin.settings.autoEmbed = false;
    registerPasteDropRouter(plugin);
    const editor = makeEditor("", 0);
    const evt = clipboardEvent("https://example.com/a\n\n");
    (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(plugin.pasteInfo).toEqual({ trigger: true, text: "https://example.com/a" });
    expect(editor.replaceSelection).toHaveBeenCalledWith("https://example.com/a");
  });

  it("autoEmbed URL paste inserts an embed block", async () => {
    const card = {
      title: "Example",
      image: "https://example.com/img.png",
      description: "Hello",
      url: "https://example.com",
    };
    const parseSpy = vi.spyOn(parsers, "parseUrl").mockResolvedValue(card);
    try {
      const plugin = makePlugin();
      plugin.settings.autoEmbed = true;
      plugin.settings.downloadImages = true;
      registerPasteDropRouter(plugin);
      const editor = makeEditor("", 0);
      const evt = clipboardEvent("https://example.com");
      (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
      expect(evt.preventDefault).toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(editor.replaceRange).toHaveBeenCalled();
      });
      expect(editor.replaceRange.mock.calls[0][0]).toBe(serializeEmbedBlock(card));
      expect(plugin.pasteInfo.trigger).toBe(false);
      expect(parseSpy).toHaveBeenCalled();
      expect(parseSpy.mock.calls[0][1].settings.downloadImages).toBe(true);
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("autoEmbed URL paste restores the URL when parseUrl fails", async () => {
    const parseSpy = vi.spyOn(parsers, "parseUrl").mockRejectedValue(new Error("timeout"));
    try {
      const plugin = makePlugin();
      plugin.settings.autoEmbed = true;
      registerPasteDropRouter(plugin);
      const editor = makeEditor("", 0);
      const evt = clipboardEvent("https://example.com");
      (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
      expect(evt.preventDefault).toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(noticeLog()).toContain(t("notice.parseFailed", { detail: "timeout" }));
      });
      expect(editor.getLine()).toContain("https://example.com");
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("does not apply downloadImages when resolving title for video or markdown", async () => {
    const card = {
      title: "Example",
      image: "https://example.com/img.png",
      description: "Hello",
      url: "https://example.com",
    };
    const parseSpy = vi.spyOn(parsers, "parseUrl").mockResolvedValue(card);
    try {
      for (const id of ["video-preview", "markdown-link"] as const) {
        parseSpy.mockClear();
        const plugin = makePlugin();
        plugin.settings.downloadImages = true;
        plugin.pasteInfo = { trigger: true, text: "https://example.com" };
        const suggest = new UrlSuggest(plugin.app, plugin);
        const editor = makeEditor("https://example.com", "https://example.com".length);
        const trigger = suggest.onTrigger(editor.getCursor(), editor as never, null);
        expect(trigger).not.toBeNull();
        const item = suggest.getSuggestions().find((choice) => choice.id === id);
        expect(item).toBeDefined();
        suggest.selectSuggestion(item!);
        await vi.waitFor(() => {
          expect(editor.replaceRange).toHaveBeenCalled();
        });
        expect(parseSpy).toHaveBeenCalled();
        expect(parseSpy.mock.calls[0][1].settings.downloadImages).toBe(false);
        expect(plugin.settings.downloadImages).toBe(true);
      }
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("replaces a pasted URL by searching the current line", async () => {
    const plugin = makePlugin();
    plugin.pasteInfo = { trigger: true, text: "https://example.com" };
    const suggest = new UrlSuggest(plugin.app, plugin);
    const editor = makeEditor("https://example.com extra", 25);
    const trigger = suggest.onTrigger(editor.getCursor(), editor as never, null);
    expect(trigger).not.toBeNull();
    const markdown = suggest.getSuggestions().find((item) => item.id === "markdown-link");
    expect(markdown).toBeDefined();
    suggest.selectSuggestion(markdown!);
    await vi.waitFor(() => {
      expect(editor.replaceRange).toHaveBeenCalled();
    });
    const [, start, end] = editor.replaceRange.mock.calls[0];
    expect(start).toEqual({ line: 0, ch: 0 });
    expect(end).toEqual({ line: 0, ch: "https://example.com".length });
  });

  it("does not intercept a media file paste", () => {
    const plugin = makePlugin();
    registerPasteDropRouter(plugin);
    const editor = makeEditor("", 0);
    const file = new File([new Uint8Array([1])], "pic.png", { type: "image/png" });
    const evt = clipboardEvent("", [file]);
    (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
    expect(evt.preventDefault).not.toHaveBeenCalled();
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("autoEmbed non-media file paste inserts a filename wiki link", async () => {
    const plugin = makePlugin();
    plugin.settings.autoEmbed = true;
    registerPasteDropRouter(plugin);
    const editor = makeEditor("", 0);
    const file = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" });
    const evt = clipboardEvent("", [file]);
    (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
    expect(evt.preventDefault).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(editor.replaceSelection).toHaveBeenCalledWith("[[doc.pdf|doc.pdf]]");
    });
  });

  it("opens FileSuggest for a non-media file when autoEmbed is off", () => {
    const plugin = makePlugin();
    plugin.settings.autoEmbed = false;
    registerPasteDropRouter(plugin);
    const fileSuggest = plugin.editorSuggests.find((s) => s instanceof FileSuggest) as FileSuggest;
    const openSpy = vi.spyOn(fileSuggest, "open");
    const editor = makeEditor("", 0);
    const file = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" });
    const evt = clipboardEvent("", [file]);
    (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalled();
  });

  it("shows a Notice after preventDefault when file copy fails", async () => {
    const plugin = makePlugin();
    plugin.settings.autoEmbed = true;
    vi.spyOn(plugin.app.vault, "createBinary").mockRejectedValue(new Error("disk full"));
    registerPasteDropRouter(plugin);
    const editor = makeEditor("", 0);
    const file = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" });
    const evt = clipboardEvent("", [file]);
    (plugin.app as WorkspaceApp).workspace.trigger("editor-paste", evt, editor);
    expect(evt.preventDefault).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(noticeLog()).toContain(t("notice.parseFailed", { detail: "disk full" }));
    });
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });
});

describe("FileSuggest copy errors", () => {
  beforeEach(() => {
    noticeLog().length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a Notice when filename-link copy fails", async () => {
    const plugin = makePlugin();
    vi.spyOn(plugin.app.vault, "createBinary").mockRejectedValue(new Error("disk full"));
    const suggest = new FileSuggest(plugin.app, plugin);
    const editor = makeEditor("", 0);
    suggest.arm(editor as never, new File([new Uint8Array([1])], "doc.pdf"));
    const filename = suggest.getSuggestions().find((item) => item.id === "filename-link");
    expect(filename).toBeDefined();
    suggest.selectSuggestion(filename!);
    await vi.waitFor(() => {
      expect(noticeLog()).toContain(t("notice.parseFailed", { detail: "disk full" }));
    });
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });
});

describe("createDefaultAttachmentLink", () => {
  it("passes the active file path string, not a TFile, as sourcePath", async () => {
    const seen: Array<{ fn: string; sourcePath: unknown; sourceType: string }> = [];
    const created = { path: "Att/doc.pdf" } as TFile;
    const app = {
      workspace: { getActiveFile: () => ({ path: "Notes/note.md" }) },
      fileManager: {
        getAvailablePathForAttachment: async (filename: string, sourcePath?: string) => {
          seen.push({ fn: "getAvailablePathForAttachment", sourcePath, sourceType: typeof sourcePath });
          expect(filename).toBe("doc.pdf");
          return "Att/doc.pdf";
        },
        generateMarkdownLink: (file: TFile, sourcePath: string) => {
          seen.push({ fn: "generateMarkdownLink", sourcePath, sourceType: typeof sourcePath });
          expect(file).toBe(created);
          return "[[Att/doc.pdf]]";
        },
      },
      vault: {
        createBinary: async (path: string, data: ArrayBuffer) => {
          expect(path).toBe("Att/doc.pdf");
          expect(data.byteLength).toBe(1);
          return created;
        },
      },
    } as unknown as App;

    const link = await createDefaultAttachmentLink(app, new File([new Uint8Array([7])], "doc.pdf"));
    expect(link).toBe("[[Att/doc.pdf]]");
    expect(seen).toEqual([
      { fn: "getAvailablePathForAttachment", sourcePath: "Notes/note.md", sourceType: "string" },
      { fn: "generateMarkdownLink", sourcePath: "Notes/note.md", sourceType: "string" },
    ]);
  });
});

describe("plugin onload", () => {
  beforeEach(() => {
    Platform.isMobile = false;
  });

  it("registers the paste/drop router alongside the embed processor", async () => {
    const plugin = makePlugin();
    await plugin.onload();
    expect(
      (plugin as unknown as { markdownProcessors: Array<{ language: string }> }).markdownProcessors[0]
        ?.language,
    ).toBe("embed");
    expect(plugin.registeredEvents.map((event) => event.name)).toEqual([
      "editor-paste",
      "editor-drop",
    ]);
  });
});
