import { describe, it, expect } from "vitest";
import { classifyClipboardText, classifyDroppedOrPastedFile } from "../src/paste/classify";

describe("classifyClipboardText", () => {
  it("accepts a single http(s) URL", () => {
    expect(classifyClipboardText("https://example.com/a")).toEqual({
      kind: "url",
      url: "https://example.com/a",
    });
  });

  it("ignores multiline or extra text", () => {
    expect(classifyClipboardText("https://a.com\nhttps://b.com").kind).toBe("ignore");
    expect(classifyClipboardText("see https://a.com").kind).toBe("ignore");
  });
});

describe("classifyDroppedOrPastedFile", () => {
  it("ignores image audio video", () => {
    expect(classifyDroppedOrPastedFile({ name: "a.png", type: "image/png" })).toBe("ignore");
    expect(classifyDroppedOrPastedFile({ name: "a.mp3", type: "audio/mpeg" })).toBe("ignore");
    expect(classifyDroppedOrPastedFile({ name: "a.mp4", type: "video/mp4" })).toBe("ignore");
  });

  it("handles pdf as non-media", () => {
    expect(classifyDroppedOrPastedFile({ name: "doc.pdf", type: "application/pdf" })).toBe(
      "non-media-file",
    );
  });
});
