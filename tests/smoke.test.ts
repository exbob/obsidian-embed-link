import { describe, it, expect } from "vitest";
import EmbedLinkPlugin from "../src/main";

describe("scaffold", () => {
  it("exports a Plugin subclass", () => {
    expect(typeof EmbedLinkPlugin).toBe("function");
  });
});
