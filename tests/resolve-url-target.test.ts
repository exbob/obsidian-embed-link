import { describe, it, expect } from "vitest";
import { resolveUrlTarget, urlTokenAtCursor } from "../src/url-target";

describe("resolveUrlTarget", () => {
  it("uses selection when it looks like a URL", () => {
    expect(
      resolveUrlTarget({
        selection: "https://a.com",
        cursorUrl: null,
        clipboard: "",
      }),
    ).toBe("https://a.com");
  });

  it("uses cursor token when selection is empty", () => {
    expect(
      resolveUrlTarget({
        selection: "",
        cursorUrl: "https://b.com",
        clipboard: "https://c.com",
      }),
    ).toBe("https://b.com");
  });

  it("uses clipboard when selection is not a URL and cursor has none", () => {
    expect(
      resolveUrlTarget({
        selection: "nope",
        cursorUrl: null,
        clipboard: "https://c.com",
      }),
    ).toBe("https://c.com");
  });

  it("returns null when nothing looks like a URL", () => {
    expect(
      resolveUrlTarget({
        selection: "hello",
        cursorUrl: "world",
        clipboard: "not a url",
      }),
    ).toBeNull();
  });
});

describe("urlTokenAtCursor", () => {
  it("returns the URL token the cursor sits on", () => {
    const line = "see https://b.com please";
    expect(urlTokenAtCursor(line, "see https://b.com".length)).toBe("https://b.com");
  });

  it("returns the URL when the cursor is at ch===0", () => {
    expect(urlTokenAtCursor("https://b.com please", 0)).toBe("https://b.com");
  });

  it("returns the URL when the cursor is at the token start", () => {
    const line = "see https://b.com please";
    expect(urlTokenAtCursor(line, "see ".length)).toBe("https://b.com");
  });

  it("returns the URL when the cursor is in the token middle", () => {
    const line = "see https://b.com please";
    expect(urlTokenAtCursor(line, "see https".length)).toBe("https://b.com");
  });

  it("returns null when the cursor is not on a URL", () => {
    expect(urlTokenAtCursor("see https://b.com please", 2)).toBeNull();
  });
});
