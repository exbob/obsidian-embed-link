import { describe, it, expect } from "vitest";
import { uniquePath } from "../src/files/copy";
import { formatFilenameWikiLink } from "../src/files/wiki-link";

describe("wiki-link", () => {
  it("uses full filename with extension as alias", () => {
    expect(formatFilenameWikiLink("Attachments/report.pdf", "report.pdf")).toBe(
      "[[Attachments/report.pdf|report.pdf]]",
    );
  });

  it("uses the unique copied filename as alias", () => {
    const exists = (p: string) => p === "Att/a.pdf" || p === "Att/a 1.pdf";
    const path = uniquePath("Att", "a.pdf", exists);
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    expect(formatFilenameWikiLink(path, fileName)).toBe("[[Att/a 2.pdf|a 2.pdf]]");
  });
});
