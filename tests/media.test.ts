import { describe, it, expect, vi } from "vitest";
import type { App, Vault } from "obsidian";
import { DEFAULT_SETTINGS } from "../src/settings";
import { downloadImageToVault, resolveImageFolderPath, uniqueFilePath } from "../src/media/download";
import { getAspectRatio } from "../src/media/aspect-ratio";
import { applyMediaSideEffects } from "../src/parsers/base";
import type { ParseOptions } from "../src/parsers/types";

class MemoryVault {
  files = new Map<string, ArrayBuffer>();

  getAbstractFileByPath(path: string) {
    return this.files.has(path) ? { path } : null;
  }

  async createFolder(_path: string): Promise<void> {}

  async createBinary(path: string, data: ArrayBuffer) {
    this.files.set(path, data);
    return { path };
  }

  async readBinary(file: { path: string }) {
    const data = this.files.get(file.path);
    if (!data) {
      throw new Error(`missing ${file.path}`);
    }
    return data;
  }
}

/** Mimics Obsidian: parent folders must exist; duplicate folders throw. */
class NestedFolderVault extends MemoryVault {
  folders = new Set<string>();
  createFolderError: Error | null = null;

  override getAbstractFileByPath(path: string) {
    if (this.folders.has(path)) {
      return { path };
    }
    return super.getAbstractFileByPath(path);
  }

  override async createFolder(path: string): Promise<void> {
    if (this.createFolderError) {
      throw this.createFolderError;
    }
    const slash = path.lastIndexOf("/");
    if (slash >= 0) {
      const parent = path.slice(0, slash);
      if (!this.folders.has(parent)) {
        throw new Error(`Folder does not exist: ${parent}`);
      }
    }
    if (this.folders.has(path)) {
      throw new Error("Folder already exists.");
    }
    this.folders.add(path);
  }
}

function pngBuffer(width: number, height: number): ArrayBuffer {
  const bytes = new Uint8Array(24);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  bytes[2] = 0x4e;
  bytes[3] = 0x47;
  bytes[4] = 0x0d;
  bytes[5] = 0x0a;
  bytes[6] = 0x1a;
  bytes[7] = 0x0a;
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes.buffer;
}

describe("uniqueFilePath", () => {
  it("appends a numeric suffix when the name exists", () => {
    const vault = new MemoryVault();
    vault.files.set("embeds/image.png", new ArrayBuffer(0));
    expect(uniqueFilePath(vault as unknown as Vault, "embeds", "image.png")).toBe(
      "embeds/image 1.png",
    );
  });

  it("increments the suffix until a free name is found", () => {
    const vault = new MemoryVault();
    vault.files.set("embeds/foo.png", new ArrayBuffer(0));
    vault.files.set("embeds/foo 1.png", new ArrayBuffer(0));
    expect(uniqueFilePath(vault as unknown as Vault, "embeds", "foo.png")).toBe(
      "embeds/foo 2.png",
    );
  });
});

describe("resolveImageFolderPath", () => {
  it("uses the plugin setting when set", () => {
    const settings = { ...DEFAULT_SETTINGS, imageFolderPath: "embeds/" };
    expect(resolveImageFolderPath(settings, undefined)).toBe("embeds");
  });

  it("falls back to the vault attachment folder when the setting is empty", () => {
    const settings = { ...DEFAULT_SETTINGS, imageFolderPath: "" };
    const app = {
      vault: {
        getConfig: (key: string) => (key === "attachmentFolderPath" ? "Attachments" : undefined),
      },
    } as unknown as App;
    expect(resolveImageFolderPath(settings, app)).toBe("Attachments");
  });
});

describe("downloadImageToVault", () => {
  it("saves under a unique name on conflict", async () => {
    const vault = new MemoryVault();
    vault.files.set("embeds/hero.png", new ArrayBuffer(0));
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(2, 1),
    }));
    const path = await downloadImageToVault(
      "https://cdn.example/hero.png",
      vault as unknown as Vault,
      "embeds",
      requestUrl as never,
    );
    expect(path).toBe("embeds/hero 1.png");
    expect(vault.files.has("embeds/hero 1.png")).toBe(true);
  });

  it("creates nested folders segment by segment", async () => {
    const vault = new NestedFolderVault();
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(2, 1),
    }));
    const path = await downloadImageToVault(
      "https://cdn.example/cover.png",
      vault as unknown as Vault,
      "embeds/covers",
      requestUrl as never,
    );
    expect(path).toBe("embeds/covers/cover.png");
    expect(vault.folders.has("embeds")).toBe(true);
    expect(vault.folders.has("embeds/covers")).toBe(true);
    expect(vault.files.has("embeds/covers/cover.png")).toBe(true);
  });

  it("ignores already-exists errors when the folder is present", async () => {
    const vault = new NestedFolderVault();
    vault.folders.add("embeds");
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(2, 1),
    }));
    const path = await downloadImageToVault(
      "https://cdn.example/cover.png",
      vault as unknown as Vault,
      "embeds",
      requestUrl as never,
    );
    expect(path).toBe("embeds/cover.png");
  });

  it("does not swallow non-exists createFolder failures", async () => {
    const vault = new NestedFolderVault();
    vault.createFolderError = new Error("permission denied");
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(2, 1),
    }));
    await expect(
      downloadImageToVault(
        "https://cdn.example/cover.png",
        vault as unknown as Vault,
        "embeds",
        requestUrl as never,
      ),
    ).rejects.toThrow("permission denied");
    expect(vault.files.size).toBe(0);
  });
});

describe("getAspectRatio", () => {
  it("returns width/height and stores it in cache", async () => {
    const cache: Record<string, unknown> = {};
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(200, 100),
    }));
    const ratio = await getAspectRatio("https://cdn.example/wide.png", cache, {
      requestUrl: requestUrl as never,
    });
    expect(ratio).toBe(2);
    expect(cache["https://cdn.example/wide.png"]).toBe(2);
  });

  it("returns a cached value without refetching", async () => {
    const cache: Record<string, unknown> = { "https://cdn.example/cached.png": 1.5 };
    const requestUrl = vi.fn();
    const ratio = await getAspectRatio("https://cdn.example/cached.png", cache, {
      requestUrl: requestUrl as never,
    });
    expect(ratio).toBe(1.5);
    expect(requestUrl).not.toHaveBeenCalled();
  });
});

describe("applyMediaSideEffects", () => {
  it("downloads the cover image when downloadImages is on", async () => {
    const vault = new MemoryVault();
    const persistCache = vi.fn();
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(4, 2),
    }));
    const options: ParseOptions = {
      settings: {
        ...DEFAULT_SETTINGS,
        downloadImages: true,
        keepAspectRatio: false,
        imageFolderPath: "embeds",
        cache: {},
      },
      vault: vault as unknown as Vault,
      requestUrl: requestUrl as never,
      persistCache,
    };
    const result = await applyMediaSideEffects(
      {
        title: "T",
        image: "https://cdn.example/cover.png",
        description: "",
        url: "https://example.com",
      },
      options,
    );
    expect(result.image).toBe("embeds/cover.png");
    expect(result.aspectRatio).toBeUndefined();
  });

  it("sets aspectRatio when keepAspectRatio is on", async () => {
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(300, 100),
    }));
    const persistCache = vi.fn();
    const settings = {
      ...DEFAULT_SETTINGS,
      downloadImages: false,
      keepAspectRatio: true,
      useCache: true,
      cache: {} as Record<string, unknown>,
    };
    const result = await applyMediaSideEffects(
      {
        title: "T",
        image: "https://cdn.example/wide.png",
        description: "",
        url: "https://example.com",
      },
      {
        settings,
        vault: new MemoryVault() as unknown as Vault,
        requestUrl: requestUrl as never,
        persistCache,
      },
    );
    expect(result.aspectRatio).toBe(3);
    expect(settings.cache["https://cdn.example/wide.png"]).toBe(3);
    expect(persistCache).toHaveBeenCalled();
  });

  it("reuses a cached vault path when useCache is on", async () => {
    const vault = new MemoryVault();
    const persistCache = vi.fn();
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(4, 2),
    }));
    const settings = {
      ...DEFAULT_SETTINGS,
      downloadImages: true,
      keepAspectRatio: false,
      useCache: true,
      imageFolderPath: "embeds",
      cache: {} as Record<string, unknown>,
    };
    const options: ParseOptions = {
      settings,
      vault: vault as unknown as Vault,
      requestUrl: requestUrl as never,
      persistCache,
    };
    const card = {
      title: "T",
      image: "https://cdn.example/cover.png",
      description: "",
      url: "https://example.com",
    };
    const first = await applyMediaSideEffects(card, options);
    const second = await applyMediaSideEffects(card, options);
    expect(first.image).toBe("embeds/cover.png");
    expect(second.image).toBe("embeds/cover.png");
    expect(vault.files.has("embeds/cover 1.png")).toBe(false);
    expect(requestUrl).toHaveBeenCalledTimes(1);
    expect(settings.cache["https://cdn.example/cover.png"]).toBe("embeds/cover.png");
    expect(persistCache).toHaveBeenCalled();
  });

  it("redownloads when the cached vault file is gone", async () => {
    const vault = new MemoryVault();
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: "",
      arrayBuffer: pngBuffer(4, 2),
    }));
    const settings = {
      ...DEFAULT_SETTINGS,
      downloadImages: true,
      keepAspectRatio: false,
      useCache: true,
      imageFolderPath: "embeds",
      cache: { "https://cdn.example/cover.png": "embeds/cover.png" } as Record<string, unknown>,
    };
    const result = await applyMediaSideEffects(
      {
        title: "T",
        image: "https://cdn.example/cover.png",
        description: "",
        url: "https://example.com",
      },
      {
        settings,
        vault: vault as unknown as Vault,
        requestUrl: requestUrl as never,
      },
    );
    expect(result.image).toBe("embeds/cover.png");
    expect(vault.files.has("embeds/cover.png")).toBe(true);
    expect(requestUrl).toHaveBeenCalledTimes(1);
  });
});
