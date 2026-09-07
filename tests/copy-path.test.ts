import { describe, it, expect } from "vitest";
import type { App } from "obsidian";
import { copyFileIntoAttachments, uniquePath } from "../src/files/copy";

describe("uniquePath", () => {
  it("adds numeric suffix before extension", () => {
    const exists = (p: string) => p === "Att/a.pdf" || p === "Att/a 1.pdf";
    expect(uniquePath("Att", "a.pdf", exists)).toBe("Att/a 2.pdf");
  });

  it("keeps the original name when the path is free", () => {
    expect(uniquePath("Att", "a.pdf", () => false)).toBe("Att/a.pdf");
  });
});

function namedBuffer(bytes: number[], name: string): ArrayBuffer & { name: string } {
  const buffer = new Uint8Array(bytes).buffer as ArrayBuffer & { name: string };
  buffer.name = name;
  return buffer;
}

describe("copyFileIntoAttachments", () => {
  it("uses getAvailablePathForAttachment for the active file", async () => {
    const written: Array<{ path: string; bytes: number }> = [];
    let seen: { filename: string; sourcePath?: string } | undefined;
    const app = {
      workspace: { getActiveFile: () => ({ path: "Notes/note.md" }) },
      fileManager: {
        getAvailablePathForAttachment: async (filename: string, sourcePath?: string) => {
          seen = { filename, sourcePath };
          return "Att/report.pdf";
        },
      },
      vault: {
        createBinary: async (path: string, data: ArrayBuffer) => {
          written.push({ path, bytes: data.byteLength });
          return { path };
        },
      },
    } as unknown as App;

    const result = await copyFileIntoAttachments(app, namedBuffer([1, 2, 3], "report.pdf"));

    expect(seen).toEqual({ filename: "report.pdf", sourcePath: "Notes/note.md" });
    expect(written).toEqual([{ path: "Att/report.pdf", bytes: 3 }]);
    expect(result).toEqual({ path: "Att/report.pdf", fileName: "report.pdf" });
  });

  it("copies a browser File through the attachment API", async () => {
    const app = {
      workspace: { getActiveFile: () => ({ path: "Notes/note.md" }) },
      fileManager: {
        getAvailablePathForAttachment: async (filename: string) => `Att/${filename}`,
      },
      vault: {
        createBinary: async (path: string, data: ArrayBuffer) => ({ path, data }),
      },
    } as unknown as App;

    const file = new File([new Uint8Array([9, 8, 7])], "slides.pptx");
    const result = await copyFileIntoAttachments(app, file);
    expect(result).toEqual({ path: "Att/slides.pptx", fileName: "slides.pptx" });
  });

  it("falls back to uniquePath when the attachment API is missing", async () => {
    const existing = new Set(["Att/a.pdf", "Att/a 1.pdf"]);
    const written: string[] = [];
    const app = {
      workspace: { getActiveFile: () => ({ path: "Notes/note.md" }) },
      fileManager: {},
      vault: {
        getConfig: (key: string) => (key === "attachmentFolderPath" ? "Att" : undefined),
        getAbstractFileByPath: (path: string) => (existing.has(path) ? { path } : null),
        createBinary: async (path: string) => {
          written.push(path);
          existing.add(path);
          return { path };
        },
      },
    } as unknown as App;

    const result = await copyFileIntoAttachments(app, namedBuffer([4], "a.pdf"));
    expect(result).toEqual({ path: "Att/a 2.pdf", fileName: "a 2.pdf" });
    expect(written).toEqual(["Att/a 2.pdf"]);
  });
});
