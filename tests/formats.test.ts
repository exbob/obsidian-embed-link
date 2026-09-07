import { describe, it, expect } from "vitest";
import {
  formatVideoPreview,
  formatMarkdownLink,
  titleOrHostname,
} from "../src/embed/formats";

describe("formats", () => {
  it("builds video preview and markdown link", () => {
    expect(formatVideoPreview("Demo", "https://youtu.be/x")).toBe(
      "![Demo](https://youtu.be/x)",
    );
    expect(formatMarkdownLink("Demo", "https://example.com")).toBe(
      "[Demo](https://example.com)",
    );
  });

  it("falls back to hostname", () => {
    expect(titleOrHostname("", "https://example.com/a")).toBe("example.com");
  });
});
