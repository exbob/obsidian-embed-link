import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
  it("fills defaults for empty object", () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("preserves known booleans and strings", () => {
    const s = normalizeSettings({
      autoEmbed: true,
      imageFolderPath: "assets/embeds",
      microlinkApiKey: "abc",
    });
    expect(s.autoEmbed).toBe(true);
    expect(s.imageFolderPath).toBe("assets/embeds");
    expect(s.microlinkApiKey).toBe("abc");
    expect(s.downloadImages).toBe(false);
  });

  it("coerces invalid types back to defaults", () => {
    expect(normalizeSettings({ autoEmbed: "yes" }).autoEmbed).toBe(false);
  });
});
