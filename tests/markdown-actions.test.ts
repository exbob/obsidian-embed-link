import { describe, it, expect } from "vitest";
import {
  deleteEmbedBlockInMarkdown,
  replaceEmbedBlockInMarkdown,
  wrapFencedEmbed,
} from "../src/embed/actions";

const INNER = `title: "Example"
url: "https://example.com"`;

describe("wrapFencedEmbed", () => {
  it("wraps inner source in an embed fence", () => {
    expect(wrapFencedEmbed(INNER)).toBe(`\`\`\`embed\n${INNER}\n\`\`\`\n`);
  });

  it("leaves an already-fenced block and ensures a trailing newline", () => {
    expect(wrapFencedEmbed(`\`\`\`embed\n${INNER}\n\`\`\``)).toBe(
      `\`\`\`embed\n${INNER}\n\`\`\`\n`,
    );
  });
});

describe("replaceEmbedBlockInMarkdown", () => {
  it("preserves list indent on replacement fences", () => {
    const markdown = [
      "before",
      "    ```embed",
      '    title: "Old"',
      '    url: "https://old.com"',
      "    ```",
      "after",
    ].join("\n");

    const next = replaceEmbedBlockInMarkdown(
      markdown,
      1,
      4,
      wrapFencedEmbed('title: "New"\nurl: "https://new.com"'),
    );

    expect(next).toBe(
      [
        "before",
        "    ```embed",
        '    title: "New"',
        '    url: "https://new.com"',
        "    ```",
        "after",
      ].join("\n"),
    );
  });

  it("round-trips an indented fence when wrapping the inner source", () => {
    const markdown = [
      "intro",
      "  ```embed",
      '  title: "Example"',
      '  url: "https://example.com"',
      "  ```",
      "outro",
    ].join("\n");

    const next = replaceEmbedBlockInMarkdown(markdown, 1, 4, wrapFencedEmbed(INNER));
    expect(next).toBe(markdown);
  });
});

describe("deleteEmbedBlockInMarkdown", () => {
  it("removes an indented fence block", () => {
    const markdown = [
      "intro",
      "    ```embed",
      '    title: "Example"',
      "    ```",
      "outro",
    ].join("\n");

    expect(deleteEmbedBlockInMarkdown(markdown, 1, 3)).toBe(["intro", "outro"].join("\n"));
  });
});
