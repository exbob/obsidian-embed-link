import { describe, it, expect } from "vitest";
import { isEmptyEditorLine } from "../src/paste/empty-line";

describe("isEmptyEditorLine", () => {
  it("true when URL pasted at start of empty line", () => {
    expect(isEmptyEditorLine("https://x.com", 12, 12)).toBe(true);
  });

  it("false when pasted mid-line", () => {
    expect(isEmptyEditorLine("hi https://x.com", 15, 12)).toBe(false);
  });
});
