import { describe, it, expect } from "vitest";
import { clearCacheForImagePaths, getCached, setCached } from "../src/cache/store";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("cache store", () => {
  it("skips when useCache is false", () => {
    const s = { ...DEFAULT_SETTINGS, useCache: false, cache: {} as Record<string, unknown> };
    setCached(s, "k", { a: 1 });
    expect(s.cache).toEqual({});
    expect(getCached(s, "k")).toBeUndefined();
  });

  it("stores when enabled", () => {
    const s = { ...DEFAULT_SETTINGS, useCache: true, cache: {} as Record<string, unknown> };
    setCached(s, "k", { a: 1 });
    expect(getCached(s, "k")).toEqual({ a: 1 });
  });

  it("clears entries by image path key or value", () => {
    const s = {
      ...DEFAULT_SETTINGS,
      useCache: true,
      cache: {
        "https://cdn.example/a.jpg": "Test/attachments/a.jpg",
        "Test/attachments/a.jpg": 1.6,
        other: "keep",
      } as Record<string, unknown>,
    };
    expect(clearCacheForImagePaths(s, ["attachments/a.jpg", "Test/attachments/a.jpg"])).toBe(
      true,
    );
    expect(s.cache).toEqual({ other: "keep" });
  });
});
