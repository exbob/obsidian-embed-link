import { describe, it, expect, vi } from "vitest";
import { Vault } from "obsidian";
import type { RequestUrlParam } from "obsidian";
import { DEFAULT_SETTINGS } from "../src/settings";
import { parseUrl, parseUrlWith, parseUrlWithFallback } from "../src/parsers/index";
import type { ParseOptions } from "../src/parsers/types";

function parseOptions(overrides: Partial<ParseOptions> = {}): ParseOptions {
  return {
    settings: DEFAULT_SETTINGS,
    vault: new Vault(),
    ...overrides,
  };
}

function withRequestUrl(fn: (request: string | RequestUrlParam) => Promise<{
  json: unknown;
  text: string;
  arrayBuffer: ArrayBuffer;
}>): ParseOptions["requestUrl"] {
  return fn as unknown as ParseOptions["requestUrl"];
}

const PAGE_HTML = `<!doctype html>
<html>
  <head>
    <title>Page Title</title>
    <meta property="og:title" content="OG Title" />
    <meta property="og:image" content="/hero.png" />
    <meta property="og:description" content="OG Desc" />
    <meta name="description" content="Meta Desc" />
    <link rel="icon" href="/icon.png" />
  </head>
</html>`;

describe("parseUrlWithFallback", () => {
  it("uses secondary when primary throws", async () => {
    const primary = vi.fn().mockRejectedValue(new Error("local fail"));
    const secondary = vi.fn().mockResolvedValue({
      title: "T",
      image: "",
      description: "",
      url: "https://example.com",
    });
    const result = await parseUrlWithFallback("https://example.com", primary, secondary);
    expect(primary).toHaveBeenCalled();
    expect(secondary).toHaveBeenCalled();
    expect(result.title).toBe("T");
  });

  it("does not call secondary when primary succeeds", async () => {
    const primary = vi.fn().mockResolvedValue({
      title: "A",
      image: "",
      description: "",
      url: "https://example.com",
    });
    const secondary = vi.fn();
    await parseUrlWithFallback("https://example.com", primary, secondary);
    expect(secondary).not.toHaveBeenCalled();
  });
});

describe("LocalParser", () => {
  it("extracts Open Graph fields from HTML", async () => {
    const requestUrl = vi.fn(async () => ({
      json: {},
      text: PAGE_HTML,
      arrayBuffer: new ArrayBuffer(0),
    }));
    const result = await parseUrlWith(
      "local",
      "https://example.com/page",
      parseOptions({ requestUrl: withRequestUrl(requestUrl) }),
    );
    expect(result).toEqual({
      title: "OG Title",
      image: "https://example.com/hero.png",
      description: "OG Desc",
      url: "https://example.com/page",
      favicon: "https://example.com/icon.png",
    });
  });

  it("throws when HTML fetch fails", async () => {
    const requestUrl = vi.fn(async () => {
      throw new Error("network");
    });
    await expect(
      parseUrlWith(
        "local",
        "https://example.com",
        parseOptions({ requestUrl: withRequestUrl(requestUrl) }),
      ),
    ).rejects.toThrow("network");
  });
});

describe("MicroLinkParser", () => {
  it("calls free API without key header", async () => {
    const requestUrl = vi.fn(async () => ({
      json: {
        status: "success",
        data: {
          title: "ML Title",
          description: "ML Desc",
          image: { url: "https://cdn.example/img.png" },
        },
      },
      text: "",
      arrayBuffer: new ArrayBuffer(0),
    }));
    const result = await parseUrlWith(
      "microlink",
      "https://example.com",
      parseOptions({ requestUrl: withRequestUrl(requestUrl) }),
    );
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.microlink.io?url=https%3A%2F%2Fexample.com",
        headers: {},
      }),
    );
    expect(result.title).toBe("ML Title");
    expect(result.image).toBe("https://cdn.example/img.png");
    expect(result.description).toBe("ML Desc");
    expect(result.url).toBe("https://example.com");
  });

  it("sends x-api-key to pro endpoint when key is set", async () => {
    const requestUrl = vi.fn(async () => ({
      json: {
        status: "success",
        data: { title: "Pro", description: "", image: { url: "" } },
      },
      text: "",
      arrayBuffer: new ArrayBuffer(0),
    }));
    await parseUrlWith(
      "microlink",
      "https://example.com",
      parseOptions({
        requestUrl: withRequestUrl(requestUrl),
        settings: { ...DEFAULT_SETTINGS, microlinkApiKey: "secret-key" },
      }),
    );
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://pro.microlink.io?url=https%3A%2F%2Fexample.com",
        headers: { "x-api-key": "secret-key" },
      }),
    );
  });
});

describe("parseUrl", () => {
  it("falls back to MicroLink when local fetch fails", async () => {
    const requestUrl = vi.fn(async (request: string | RequestUrlParam) => {
      const url = typeof request === "string" ? request : request.url;
      if (url.includes("api.microlink.io")) {
        return {
          json: {
            status: "success",
            data: { title: "From MicroLink", description: "d", image: { url: "" } },
          },
          text: "",
          arrayBuffer: new ArrayBuffer(0),
        };
      }
      throw new Error("local fail");
    });
    const result = await parseUrl(
      "https://example.com",
      parseOptions({ requestUrl: withRequestUrl(requestUrl) }),
    );
    expect(result.title).toBe("From MicroLink");
  });
});
