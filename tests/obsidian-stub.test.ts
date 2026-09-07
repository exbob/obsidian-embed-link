import { describe, it, expect } from "vitest";
import { Vault } from "obsidian";
import { uniqueFilePath } from "../src/media/download";

type StubVault = Vault & { addExistingFile(path: string): { path: string } };

function stubVault(): StubVault {
  return new Vault() as StubVault;
}

describe("Vault stub getAbstractFileByPath", () => {
  it("returns null for unknown paths", () => {
    expect(new Vault().getAbstractFileByPath("embeds/cover.png")).toBeNull();
  });

  it("returns a file after the path is registered", () => {
    const vault = stubVault();
    vault.addExistingFile("embeds/cover.png");
    expect(vault.getAbstractFileByPath("embeds/cover.png")?.path).toBe("embeds/cover.png");
  });

  it("lets uniqueFilePath use the first name when nothing is registered", () => {
    expect(uniqueFilePath(new Vault(), "embeds", "cover.png")).toBe("embeds/cover.png");
  });

  it("lets uniqueFilePath skip registered names", () => {
    const vault = stubVault();
    vault.addExistingFile("embeds/cover.png");
    expect(uniqueFilePath(vault, "embeds", "cover.png")).toBe("embeds/cover 1.png");
  });
});
