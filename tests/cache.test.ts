import { describe, it, expect } from "vitest";
import { getCached, setCached } from "../src/cache/store";
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
});
