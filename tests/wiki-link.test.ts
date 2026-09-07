import { describe, it, expect } from "vitest";
import { formatFilenameWikiLink } from "../src/files/wiki-link";

describe("wiki-link", () => {
  it("uses full filename with extension as alias", () => {
    expect(formatFilenameWikiLink("Attachments/report.pdf", "report.pdf")).toBe(
      "[[Attachments/report.pdf|report.pdf]]",
    );
  });
});
