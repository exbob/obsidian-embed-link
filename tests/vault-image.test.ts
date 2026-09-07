import { describe, it, expect } from "vitest";
import { App, TFile } from "obsidian";
import { deleteLocalEmbedImage, resolveVaultImageFile } from "../src/media/vault-image";

type TestVault = App["vault"] & {
  addExistingFile: (path: string) => TFile;
  deletedPaths: string[];
};

describe("resolveVaultImageFile", () => {
  it("returns null for remote URLs", () => {
    const app = new App();
    expect(resolveVaultImageFile(app, "https://cdn.example/a.jpg", "Test/index.md")).toBeNull();
  });

  it("resolves note-relative attachment paths", () => {
    const app = new App();
    (app.vault as TestVault).addExistingFile("Test/attachments/a.jpg");
    const file = resolveVaultImageFile(app, "attachments/a.jpg", "Test/index.md");
    expect(file).toBeInstanceOf(TFile);
    expect(file?.path).toBe("Test/attachments/a.jpg");
  });
});

describe("deleteLocalEmbedImage", () => {
  it("skips remote images", async () => {
    const app = new App();
    await expect(
      deleteLocalEmbedImage(app, "https://cdn.example/a.jpg", "Test/index.md"),
    ).resolves.toBe("skipped");
  });

  it("trashes a local preview image", async () => {
    const app = new App();
    const vault = app.vault as TestVault;
    vault.addExistingFile("Test/attachments/a.jpg");
    await expect(
      deleteLocalEmbedImage(app, "attachments/a.jpg", "Test/index.md"),
    ).resolves.toBe("deleted");
    expect(app.vault.getAbstractFileByPath("Test/attachments/a.jpg")).toBeNull();
    expect(vault.deletedPaths).toContain("Test/attachments/a.jpg");
  });
});
