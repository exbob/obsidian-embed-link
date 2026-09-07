# Embed Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Obsidian plugin (`embed-link`) that intercepts paste/drop of URLs and non-media files, turning them into readable embed cards or filename wiki links.

**Architecture:** NestNote-style TypeScript project (`src/` layers, `build.sh`, i18n, Vitest, tag release). Selectively port Local/MicroLink parsing and `embed` card rendering from obsidian-link-embed; add a unified paste/drop router for URLs and files.

**Tech Stack:** TypeScript, Obsidian API, esbuild, Vitest + happy-dom, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-07-embed-link-design.md`

## Global Constraints

- Plugin ID `embed-link`, display name `Embed Link`, author `LiShaocheng`, `minAppVersion` `1.7.2`, `isDesktopOnly` `false`, license GPL-3.0.
- Parsers: Local primary, MicroLink fallback only (no other engines).
- Desktop: paste + drop; mobile: paste only.
- Do not intercept: non-empty-line URLs; image/audio/video files; multiline/mixed/multi-file pastes.
- Embed hover: Edit top-right; bottom-right Delete → Copy → Refresh.
- Release tags match `manifest.json` version with **no `v` prefix**.
- UI strings via i18n (`zh` if Obsidian language starts with `zh`, else `en`).
- Follow TDD for pure logic; commit after each task.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `manifest.json` | Plugin manifest |
| `versions.json` | Obsidian version compatibility map |
| `package.json` / `package-lock.json` | Scripts and deps |
| `esbuild.config.mjs` | Bundle `src/main.ts` → `main.js` |
| `tsconfig.json` / `vitest.config.ts` | TS + tests (obsidian stub alias) |
| `build.sh` | Production publish into `./embed-link/` |
| `.gitignore` | Ignore `node_modules/`, `main.js`, `embed-link/`, etc. |
| `.github/workflows/release.yml` | Tag → test → draft release |
| `styles.css` | Embed card styles (ported/simplified from Link Embed) |
| `src/main.ts` | Plugin lifecycle, register processors/commands/handlers |
| `src/settings.ts` | Settings type, defaults, normalize |
| `src/types.ts` | Shared types (`EmbedData`, paste kinds, etc.) |
| `src/i18n/*` | Locale catalogs + `t()` |
| `src/paste/classify.ts` | Classify clipboard/drop payload |
| `src/paste/empty-line.ts` | Detect empty editor line |
| `src/paste/handler.ts` | Paste/drop event wiring |
| `src/ui/url-suggest.ts` | URL suggestion menu |
| `src/ui/file-suggest.ts` | File suggestion menu |
| `src/ui/settings-tab.ts` | Settings UI |
| `src/parsers/types.ts` | `ParsedLinkData`, parser options |
| `src/parsers/local.ts` | Local HTML/OG parser |
| `src/parsers/microlink.ts` | MicroLink API parser |
| `src/parsers/orchestrator.ts` | Local → MicroLink / forced parser |
| `src/embed/serialize.ts` | Embed block ↔ object |
| `src/embed/processor.ts` | `MarkdownCodeBlockProcessor` + card DOM |
| `src/embed/actions.ts` | Edit / delete / copy / refresh |
| `src/files/copy-file.ts` | Copy external file into vault attachment folder |
| `src/files/wiki-link.ts` | Build `[[path\|name.ext]]` |
| `src/cache/meta-cache.ts` | Favicon + aspectRatio cache |
| `src/images/download.ts` | Download remote image into vault |
| `tests/obsidian-stub.ts` | Minimal Obsidian mocks for Vitest |
| `tests/**/*.test.ts` | Unit tests |
| `README.md` / `README_zh.md` | User + contributor docs |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `esbuild.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `tests/obsidian-stub.ts`, `.gitignore`, `manifest.json`, `versions.json`, `styles.css` (empty comment), `src/main.ts`, `src/types.ts`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: buildable plugin shell exporting class `EmbedLinkPlugin extends Plugin`

- [ ] **Step 1: Write failing smoke test**

Create `tests/obsidian-stub.ts`:

```ts
export class Plugin {
  app: unknown;
  async loadData(): Promise<unknown> {
    return {};
  }
  async saveData(_data: unknown): Promise<void> {}
  addCommand(_cmd: unknown): void {}
  addSettingTab(_tab: unknown): void {}
  registerMarkdownCodeBlockProcessor(_lang: string, _cb: unknown): void {}
  registerEvent(_e: unknown): void {}
  registerEditorSuggest(_s: unknown): void {}
  onunload(): void {}
}

export class PluginSettingTab {}
export class Notice {
  constructor(_msg: string) {}
}
export class Modal {}
export class MarkdownView {}
export class EditorSuggest {
  constructor(_app: unknown) {}
  close(): void {}
}
export async function requestUrl(_opts: unknown): Promise<{ json: unknown; text: string; arrayBuffer: ArrayBuffer }> {
  return { json: {}, text: "", arrayBuffer: new ArrayBuffer(0) };
}
export function setIcon(_el: HTMLElement, _id: string): void {}
```

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import EmbedLinkPlugin from "../src/main";

describe("scaffold", () => {
  it("exports a Plugin subclass", () => {
    expect(typeof EmbedLinkPlugin).toBe("function");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (missing module)**

Run: `npm install` then `npm test`

Expected: FAIL resolving `../src/main` or similar.

- [ ] **Step 3: Add scaffold files**

`package.json`:

```json
{
  "name": "embed-link",
  "version": "0.1.0",
  "private": true,
  "license": "GPL-3.0",
  "scripts": {
    "dev": "node esbuild.config.mjs development",
    "build": "node esbuild.config.mjs production",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "esbuild": "latest",
    "happy-dom": "latest",
    "obsidian": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

`esbuild.config.mjs` — copy NestNote’s config (`entryPoints: ["src/main.ts"]`, same `external` list, `outfile: "main.js"`).

`tsconfig.json` / `vitest.config.ts` — copy NestNote’s (alias `obsidian` → `tests/obsidian-stub.ts`). Drop NestNote’s `tests/i18n-setup.ts` until Task 2; omit `setupFiles` for now.

`.gitignore`:

```gitignore
node_modules/
main.js
main.js.map
.obsidian/
.superpowers/
.worktrees/
coverage/
/embed-link/
```

`manifest.json`:

```json
{
  "id": "embed-link",
  "name": "Embed Link",
  "version": "0.1.0",
  "minAppVersion": "1.7.2",
  "description": "Paste URLs and files as readable embeds and filename links.",
  "author": "LiShaocheng",
  "authorUrl": "https://shaocheng.li",
  "isDesktopOnly": false
}
```

`versions.json`:

```json
{
  "0.1.0": "1.7.2"
}
```

`src/types.ts`:

```ts
export interface EmbedData {
  title: string;
  image: string;
  description: string;
  url: string;
  favicon?: string;
  aspectRatio?: string;
}

export type PasteKind =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File }
  | { kind: "ignore" };
```

`src/main.ts`:

```ts
import { Plugin } from "obsidian";

export default class EmbedLinkPlugin extends Plugin {
  async onload(): Promise<void> {
    // wired in later tasks
  }
}
```

`styles.css`: `/* Embed Link styles */`

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json esbuild.config.mjs tsconfig.json vitest.config.ts tests .gitignore manifest.json versions.json styles.css src/main.ts src/types.ts
git commit -m "chore: scaffold Embed Link plugin project"
```

---

### Task 2: Settings model + i18n

**Files:**
- Create: `src/settings.ts`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/index.ts`, `tests/i18n-setup.ts`
- Modify: `vitest.config.ts` (add `setupFiles`)
- Test: `tests/settings.test.ts`, `tests/i18n.test.ts`

**Interfaces:**
- Produces:
  - `export interface EmbedLinkSettings { autoEmbed: boolean; saveImagesToVault: boolean; imageFolderPath: string; respectAspectRatio: boolean; useCache: boolean; enableFavicon: boolean; microlinkApiKey: string; }`
  - `export const DEFAULT_SETTINGS: EmbedLinkSettings`
  - `export function normalizeSettings(raw: unknown): EmbedLinkSettings`
  - `export function t(key: MessageKey, vars?: Record<string, string | number>): string`

- [ ] **Step 1: Write failing settings + i18n tests**

```ts
// tests/settings.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
  it("fills defaults for empty object", () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps known booleans and trims api key", () => {
    const s = normalizeSettings({
      autoEmbed: true,
      microlinkApiKey: "  abc  ",
    });
    expect(s.autoEmbed).toBe(true);
    expect(s.microlinkApiKey).toBe("abc");
    expect(s.enableFavicon).toBe(DEFAULT_SETTINGS.enableFavicon);
  });
});
```

```ts
// tests/i18n.test.ts
import { describe, expect, it } from "vitest";
import { setLocaleForTests, t } from "../src/i18n";

describe("i18n", () => {
  it("returns English for menu.embed", () => {
    setLocaleForTests("en");
    expect(t("menu.embed")).toContain("Embed");
  });

  it("returns Chinese when locale is zh", () => {
    setLocaleForTests("zh");
    expect(t("menu.embed")).toMatch(/嵌入/);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- tests/settings.test.ts tests/i18n.test.ts`  
Expected: FAIL module not found.

- [ ] **Step 3: Implement settings + i18n**

`src/settings.ts` — defaults from spec:

```ts
export interface EmbedLinkSettings {
  autoEmbed: boolean;
  saveImagesToVault: boolean;
  imageFolderPath: string;
  respectAspectRatio: boolean;
  useCache: boolean;
  enableFavicon: boolean;
  microlinkApiKey: string;
}

export const DEFAULT_SETTINGS: EmbedLinkSettings = {
  autoEmbed: false,
  saveImagesToVault: false,
  imageFolderPath: "",
  respectAspectRatio: true,
  useCache: true,
  enableFavicon: true,
  microlinkApiKey: "",
};

export function normalizeSettings(raw: unknown): EmbedLinkSettings {
  const r = (raw ?? {}) as Partial<EmbedLinkSettings>;
  return {
    autoEmbed: typeof r.autoEmbed === "boolean" ? r.autoEmbed : DEFAULT_SETTINGS.autoEmbed,
    saveImagesToVault:
      typeof r.saveImagesToVault === "boolean"
        ? r.saveImagesToVault
        : DEFAULT_SETTINGS.saveImagesToVault,
    imageFolderPath:
      typeof r.imageFolderPath === "string"
        ? r.imageFolderPath.trim()
        : DEFAULT_SETTINGS.imageFolderPath,
    respectAspectRatio:
      typeof r.respectAspectRatio === "boolean"
        ? r.respectAspectRatio
        : DEFAULT_SETTINGS.respectAspectRatio,
    useCache: typeof r.useCache === "boolean" ? r.useCache : DEFAULT_SETTINGS.useCache,
    enableFavicon:
      typeof r.enableFavicon === "boolean"
        ? r.enableFavicon
        : DEFAULT_SETTINGS.enableFavicon,
    microlinkApiKey:
      typeof r.microlinkApiKey === "string"
        ? r.microlinkApiKey.trim()
        : DEFAULT_SETTINGS.microlinkApiKey,
  };
}
```

`src/i18n/*` — mirror NestNote’s `resolveLocale` / `t` / `setLocaleForTests`. Include at least these keys in both `en` and `zh`:

- `menu.embed`, `menu.markdown`, `menu.plain`
- `menu.fileNamed`, `menu.fileDefault`
- `cmd.embedCurrent`, `cmd.embedLocal`, `cmd.embedMicrolink`
- `setting.autoEmbed`, `setting.autoEmbedDesc`
- `setting.saveImages`, `setting.saveImagesDesc`
- `setting.imagePath`, `setting.imagePathDesc`
- `setting.aspectRatio`, `setting.aspectRatioDesc`
- `setting.cache`, `setting.cacheDesc`
- `setting.favicon`, `setting.faviconDesc`
- `setting.microlinkKey`, `setting.microlinkKeyDesc`
- `notice.parseFailed`, `notice.deleteConfirm`
- `action.edit`, `action.delete`, `action.copy`, `action.refresh`

Wire `tests/i18n-setup.ts` to `setLocaleForTests("en")` and add it to `vitest.config.ts` `setupFiles`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts src/i18n tests/settings.test.ts tests/i18n.test.ts tests/i18n-setup.ts vitest.config.ts
git commit -m "feat(settings): add defaults, normalize, and i18n catalogs"
```

---

### Task 3: Paste classification + empty-line helper

**Files:**
- Create: `src/paste/classify.ts`, `src/paste/empty-line.ts`
- Test: `tests/paste-classify.test.ts`, `tests/empty-line.test.ts`

**Interfaces:**
- Produces:
  - `export function isHttpUrl(text: string): boolean`
  - `export function classifyTextPaste(text: string): PasteKind`
  - `export function classifyFile(file: File): PasteKind` — ignore image/audio/video by MIME or extension
  - `export function isEditorLineEmpty(lineText: string): boolean` — true if line is empty or only whitespace

- [ ] **Step 1: Write failing tests**

```ts
// tests/paste-classify.test.ts
import { describe, expect, it } from "vitest";
import { classifyFile, classifyTextPaste, isHttpUrl } from "../src/paste/classify";

describe("classifyTextPaste", () => {
  it("accepts a single http URL", () => {
    expect(classifyTextPaste("https://example.com/a")).toEqual({
      kind: "url",
      url: "https://example.com/a",
    });
  });

  it("ignores multiline or non-URL text", () => {
    expect(classifyTextPaste("hello").kind).toBe("ignore");
    expect(classifyTextPaste("https://a.com\nhttps://b.com").kind).toBe("ignore");
  });
});

describe("classifyFile", () => {
  it("ignores image audio video", () => {
    expect(classifyFile(new File([], "a.png", { type: "image/png" })).kind).toBe("ignore");
    expect(classifyFile(new File([], "a.mp3", { type: "audio/mpeg" })).kind).toBe("ignore");
    expect(classifyFile(new File([], "a.mp4", { type: "video/mp4" })).kind).toBe("ignore");
  });

  it("handles other files", () => {
    const f = new File([], "doc.pdf", { type: "application/pdf" });
    expect(classifyFile(f)).toEqual({ kind: "file", file: f });
  });
});

describe("isHttpUrl", () => {
  it("rejects javascript and relative", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("/path")).toBe(false);
  });
});
```

```ts
// tests/empty-line.test.ts
import { describe, expect, it } from "vitest";
import { isEditorLineEmpty } from "../src/paste/empty-line";

describe("isEditorLineEmpty", () => {
  it("treats blank and whitespace as empty", () => {
    expect(isEditorLineEmpty("")).toBe(true);
    expect(isEditorLineEmpty("   ")).toBe(true);
  });

  it("treats text as non-empty", () => {
    expect(isEditorLineEmpty("x")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

`isHttpUrl`: trim; must parse with `URL`; protocol `http:` or `https:` only; entire trimmed string must be that single URL (no surrounding text).

`classifyTextPaste`: if not `isHttpUrl` → `{ kind: "ignore" }`; else `{ kind: "url", url: trimmed }`.

`classifyFile`: if `file.type` starts with `image/`, `audio/`, `video/` → ignore; also check extensions `.png .jpg .jpeg .gif .webp .svg .bmp .ico .mp3 .wav .ogg .m4a .flac .mp4 .webm .mov .mkv .avi`; else `{ kind: "file", file }`.

`isEditorLineEmpty`: `lineText.trim() === ""`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/paste/classify.ts src/paste/empty-line.ts tests/paste-classify.test.ts tests/empty-line.test.ts
git commit -m "feat(paste): classify URLs and non-media files"
```

---

### Task 4: Embed serialize / parse

**Files:**
- Create: `src/embed/serialize.ts`
- Test: `tests/embed-serialize.test.ts`

**Interfaces:**
- Produces:
  - `export function serializeEmbed(data: EmbedData): string` — full fenced block including \`\`\`embed fences
  - `export function parseEmbed(source: string): EmbedData` — parse inner YAML-like `key: "value"` lines

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseEmbed, serializeEmbed } from "../src/embed/serialize";

describe("embed serialize", () => {
  it("round-trips core fields", () => {
    const data = {
      title: "Hello",
      image: "https://img",
      description: "Desc",
      url: "https://example.com",
      favicon: "https://example.com/favicon.ico",
      aspectRatio: "1.5",
    };
    const block = serializeEmbed(data);
    expect(block.startsWith("```embed\n")).toBe(true);
    expect(block.trimEnd().endsWith("```")).toBe(true);
    expect(parseEmbed(block.replace(/^```embed\n/, "").replace(/\n```$/, ""))).toEqual(data);
  });

  it("omits empty optional fields", () => {
    const block = serializeEmbed({
      title: "T",
      image: "",
      description: "",
      url: "https://x.com",
    });
    expect(block).not.toContain("favicon:");
    expect(block).not.toContain("aspectRatio:");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Escape values by wrapping in double quotes and escaping `\` and `"` inside. Parse with line regex `/^(\w+):\s*"(.*)"\s*$/` and unescape. Accept source with or without surrounding fences (processor usually gets inner source only — `parseEmbed` takes **inner** source; test may pass inner after strip, or implement `parseEmbed` to strip fences if present).

Preferred: `parseEmbed` accepts **inner** source only (what Obsidian code-block processor provides). Adjust test accordingly:

```ts
const inner = `title: "Hello"
image: "https://img"
description: "Desc"
url: "https://example.com"
favicon: "https://example.com/favicon.ico"
aspectRatio: "1.5"`;
expect(parseEmbed(inner)).toEqual(data);
const block = serializeEmbed(data);
expect(block).toBe("```embed\n" + inner + "\n```\n");
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/embed/serialize.ts tests/embed-serialize.test.ts
git commit -m "feat(embed): serialize and parse embed code blocks"
```

---

### Task 5: Wiki link + unique vault path helpers

**Files:**
- Create: `src/files/wiki-link.ts`, `src/files/unique-path.ts`
- Test: `tests/wiki-link.test.ts`, `tests/unique-path.test.ts`

**Interfaces:**
- Produces:
  - `export function buildFilenameWikiLink(vaultPath: string, fileName: string): string` → `[[vaultPath|fileName]]`
  - `export function nextAvailablePath(exists: (path: string) => boolean, folder: string, fileName: string): string`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildFilenameWikiLink } from "../src/files/wiki-link";
import { nextAvailablePath } from "../src/files/unique-path";

describe("buildFilenameWikiLink", () => {
  it("uses full filename with extension as alias", () => {
    expect(buildFilenameWikiLink("Attachments/report.pdf", "report.pdf")).toBe(
      "[[Attachments/report.pdf|report.pdf]]",
    );
  });
});

describe("nextAvailablePath", () => {
  it("returns original when free", () => {
    expect(nextAvailablePath(() => false, "Attachments", "a.pdf")).toBe("Attachments/a.pdf");
  });

  it("suffixes before extension when taken", () => {
    const taken = new Set(["Attachments/a.pdf"]);
    expect(
      nextAvailablePath((p) => taken.has(p), "Attachments", "a.pdf"),
    ).toBe("Attachments/a 1.pdf");
  });
});
```

- [ ] **Step 2–4: Implement until PASS** — join folder with `/` (normalize no trailing slash); for suffix use `name ${n}.ext` pattern like NestNote/Link Embed.

- [ ] **Step 5: Commit**

```bash
git add src/files/wiki-link.ts src/files/unique-path.ts tests/wiki-link.test.ts tests/unique-path.test.ts
git commit -m "feat(files): wiki link format and unique path helper"
```

---

### Task 6: Parser orchestrator + MicroLink

**Files:**
- Create: `src/parsers/types.ts`, `src/parsers/microlink.ts`, `src/parsers/orchestrator.ts`
- Test: `tests/parser-orchestrator.test.ts`

**Interfaces:**
- Produces:
  - `export interface ParsedLinkData { title: string; image: string; description: string; url: string; favicon?: string; aspectRatio?: number; }`
  - `export interface LinkParser { parse(url: string): Promise<ParsedLinkData>; }`
  - `export function createMicroLinkParser(opts: { apiKey?: string; requestJson: (url: string) => Promise<unknown>; }): LinkParser`
  - `export async function parseWithFallback(url: string, primary: LinkParser, fallback: LinkParser): Promise<ParsedLinkData>`
  - `export async function parseForced(url: string, parser: LinkParser): Promise<ParsedLinkData>` — rethrow on failure

- [ ] **Step 1: Write failing orchestrator tests with fake parsers**

```ts
import { describe, expect, it, vi } from "vitest";
import { parseForced, parseWithFallback } from "../src/parsers/orchestrator";
import type { LinkParser, ParsedLinkData } from "../src/parsers/types";

const sample: ParsedLinkData = {
  title: "T",
  image: "",
  description: "D",
  url: "https://example.com",
};

describe("parseWithFallback", () => {
  it("returns primary result when primary succeeds", async () => {
    const primary: LinkParser = { parse: vi.fn(async () => sample) };
    const fallback: LinkParser = { parse: vi.fn(async () => sample) };
    await expect(parseWithFallback("https://example.com", primary, fallback)).resolves.toEqual(sample);
    expect(fallback.parse).not.toHaveBeenCalled();
  });

  it("uses fallback when primary throws", async () => {
    const primary: LinkParser = { parse: vi.fn(async () => { throw new Error("fail"); }) };
    const fallback: LinkParser = { parse: vi.fn(async () => ({ ...sample, title: "FB" })) };
    const r = await parseWithFallback("https://example.com", primary, fallback);
    expect(r.title).toBe("FB");
  });
});

describe("parseForced", () => {
  it("does not swallow errors", async () => {
    const parser: LinkParser = { parse: vi.fn(async () => { throw new Error("x"); }) };
    await expect(parseForced("https://example.com", parser)).rejects.toThrow("x");
  });
});
```

Also test MicroLink `process` mapping via exporting `mapMicroLinkResponse(json: unknown, url: string): ParsedLinkData` used internally.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

MicroLink request URL: `https://api.microlink.io?url=${encodeURIComponent(url)}` plus optional `&apiKey=` when key non-empty (check MicroLink docs; Link Embed uses mustache URL without key — if key supported, append as query param `apiKey`).

Map: `data.title`, `data.image?.url || data.logo?.url`, `data.description` (flatten newlines), `data.logo?.url` or favicon field if present for favicon.

- [ ] **Step 4: PASS + Commit**

```bash
git add src/parsers tests/parser-orchestrator.test.ts
git commit -m "feat(parsers): MicroLink parser and fallback orchestrator"
```

---

### Task 7: Local parser

**Files:**
- Create: `src/parsers/local.ts`
- Test: `tests/local-parser.test.ts`

**Interfaces:**
- Produces: `export function createLocalParser(opts: { fetchText: (url: string) => Promise<string>; }): LinkParser`
- Also export `export function extractMetadataFromHtml(html: string, url: string): ParsedLinkData` for unit tests without network

- [ ] **Step 1: Write failing HTML extraction tests**

```ts
import { describe, expect, it } from "vitest";
import { extractMetadataFromHtml } from "../src/parsers/local";

describe("extractMetadataFromHtml", () => {
  it("reads Open Graph tags", () => {
    const html = `<html><head>
      <meta property="og:title" content="OG Title" />
      <meta property="og:description" content="OG Desc" />
      <meta property="og:image" content="https://cdn/img.png" />
      <link rel="icon" href="/favicon.ico" />
    </head></html>`;
    const r = extractMetadataFromHtml(html, "https://example.com/page");
    expect(r.title).toBe("OG Title");
    expect(r.description).toBe("OG Desc");
    expect(r.image).toBe("https://cdn/img.png");
    expect(r.url).toBe("https://example.com/page");
    expect(r.favicon).toBe("https://example.com/favicon.ico");
  });

  it("falls back to <title>", () => {
    const html = `<html><head><title>Plain</title></head></html>`;
    expect(extractMetadataFromHtml(html, "https://example.com").title).toBe("Plain");
  });
});
```

- [ ] **Step 2–4:** Port **simplified** logic from Link Embed `LocalParser.ts` (OG + twitter + title + favicon resolve against page URL). Do **not** port concurrency limiter or unrelated engines. Use `DOMParser` in happy-dom / browser.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/local.ts tests/local-parser.test.ts
git commit -m "feat(parsers): add Local HTML metadata parser"
```

---

### Task 8: Meta cache + image download helpers

**Files:**
- Create: `src/cache/meta-cache.ts`, `src/images/download.ts`, `src/images/aspect.ts`
- Test: `tests/meta-cache.test.ts`, `tests/aspect.test.ts`

**Interfaces:**
- Produces:
  - `export class MetaCache { getFavicon(url: string): string | undefined; setFavicon(url: string, v: string): void; getAspect(url: string): number | undefined; setAspect(url: string, v: number): void; toJSON(): unknown; static fromJSON(raw: unknown): MetaCache; }`
  - `export function resolveImageFolder(settingsPath: string, obsidianAttachmentPath: string): string` — empty settings → Obsidian path; else settings path
  - `export async function downloadImageToVault(...): Promise<string>` — implement against injected vault adapter in tests with fake `exists`/`writeBinary`

- [ ] **Step 1: Tests for cache round-trip and `resolveImageFolder`**

```ts
expect(resolveImageFolder("", "Attachments")).toBe("Attachments");
expect(resolveImageFolder("embeds", "Attachments")).toBe("embeds");
```

- [ ] **Step 2–4: Implement until PASS**

Aspect helper: given width/height return `width/height` number; serialization to embed string happens later via `String(ratio)`.

- [ ] **Step 5: Commit**

```bash
git add src/cache src/images tests/meta-cache.test.ts tests/aspect.test.ts
git commit -m "feat(cache): favicon/aspect cache and image folder resolve"
```

---

### Task 9: Embed card processor + hover actions

**Files:**
- Create: `src/embed/processor.ts`, `src/embed/actions.ts`
- Modify: `styles.css` (port card look from Link Embed `styles.css`, keep class prefix `embed-link-` to avoid collisions)
- Modify: `src/main.ts` — register `registerMarkdownCodeBlockProcessor("embed", ...)`
- Test: `tests/embed-actions.test.ts` (pure helpers: find block range, replace/delete text in string buffer)

**Interfaces:**
- Produces:
  - `export function registerEmbedProcessor(plugin: EmbedLinkPlugin): void`
  - Card DOM structure with CSS classes; favicon hidden when `!settings.enableFavicon`
  - Hover buttons: `.embed-link-edit` (top-right); bottom-right `.embed-link-delete`, `.embed-link-copy`, `.embed-link-refresh` in that order
  - **Edit:** replace preview with `<textarea>` prefilled with inner source; on blur or Ctrl/Cmd+Enter write back via editor transaction / `sectionInfo` if available; if no editor info, use Notice and skip
  - **Delete:** `window.confirm(t("notice.deleteConfirm"))` then remove entire fence block
  - **Copy:** `navigator.clipboard.writeText(serializeEmbed(data))`
  - **Refresh:** re-parse `data.url` via orchestrator and replace block

**Pure helper for tests:**

```ts
export function replaceEmbedBlockInMarkdown(
  markdown: string,
  blockStartOffset: number,
  blockEndOffset: number,
  newBlock: string,
): string;
```

- [ ] **Step 1: Write failing tests for markdown block replace/delete helpers**

- [ ] **Step 2–4:** Implement processor + CSS. Visual match Link Embed card (title, description, image, favicon, link). Use `setIcon` for buttons when available.

- [ ] **Step 5: Commit**

```bash
git add src/embed/processor.ts src/embed/actions.ts styles.css src/main.ts tests/embed-actions.test.ts
git commit -m "feat(embed): render cards with edit delete copy refresh"
```

---

### Task 10: Paste/drop handler + suggest menus

**Files:**
- Create: `src/paste/handler.ts`, `src/ui/url-suggest.ts`, `src/ui/file-suggest.ts`, `src/embed/insert.ts`, `src/files/copy-file.ts`
- Modify: `src/main.ts`
- Test: `tests/paste-handler-logic.test.ts` (decision table without DOM)

**Interfaces:**
- Produces:
  - `export function shouldHandleUrlPaste(opts: { autoEmbed: boolean; lineEmpty: boolean; kind: PasteKind }): "auto-embed" | "suggest" | "ignore"`
  - `export function shouldHandleFilePaste(opts: { autoEmbed: boolean; kind: PasteKind }): "auto-file" | "suggest" | "ignore"`
  - URL suggest choices use `t("menu.*")`
  - After Obsidian pastes URL on empty line: if suggest mode, set trigger flag and open `EditorSuggest`; if auto, replace pasted URL range with embed block (async parse — insert placeholder embed with url/title=url then refresh, or wait then replace; prefer: show Notice “Fetching…”, then replace URL text with finished block)
  - File suggest: on “filename link”, `copyFile` into Obsidian attachment folder (`app.vault.getConfig("attachmentFolderPath")` or equivalent API / `app.fileManager.getAvailablePathForAttachment`), insert wiki link; on “default”, re-dispatch default by writing file via `editor`/`fileManager` the same way Obsidian would (use `app.fileManager.importFile` / drop handling — if unavailable, `vault.createBinary` + default embed link syntax Obsidian uses)
  - Desktop register both `paste` and `drop` on editor container via `registerDomEvent` on workspace active editor; mobile skip `drop`

Decision tests:

```ts
expect(shouldHandleUrlPaste({ autoEmbed: false, lineEmpty: false, kind: { kind: "url", url: "https://x" } })).toBe("ignore");
expect(shouldHandleUrlPaste({ autoEmbed: false, lineEmpty: true, kind: { kind: "url", url: "https://x" } })).toBe("suggest");
expect(shouldHandleUrlPaste({ autoEmbed: true, lineEmpty: true, kind: { kind: "url", url: "https://x" } })).toBe("auto-embed");
expect(shouldHandleFilePaste({ autoEmbed: true, kind: { kind: "file", file: new File([], "a.pdf") } })).toBe("auto-file");
```

Markdown link path: parse title via fallback orchestrator; on failure use `new URL(url).hostname`; replace with `[title](url)`.

- [ ] **Step 1–4: TDD decision helpers, then wire handler + suggests**

- [ ] **Step 5: Commit**

```bash
git add src/paste/handler.ts src/ui/url-suggest.ts src/ui/file-suggest.ts src/embed/insert.ts src/files/copy-file.ts src/main.ts tests/paste-handler-logic.test.ts
git commit -m "feat(paste): URL and file suggest menus with auto-embed"
```

---

### Task 11: Settings tab + commands + plugin wiring

**Files:**
- Create: `src/ui/settings-tab.ts`
- Modify: `src/main.ts`, `src/settings.ts` (load/save on plugin)
- Test: manual checklist below (commands hard to unit-test); add `tests/resolve-url-target.test.ts` for URL resolution order

**Interfaces:**
- Produces:
  - `export function resolveUrlTarget(opts: { selection: string; cursorUrl: string | null; clipboard: string }): string | null` — selection if URL, else cursor token if URL, else clipboard if URL
  - Commands registered:
    1. `embed-link:embed-current` → `t("cmd.embedCurrent")`
    2. `embed-link:embed-local`
    3. `embed-link:embed-microlink`
  - Settings tab toggles/fields for all settings in spec
  - On load: `settings = normalizeSettings(await loadData())`; restore `MetaCache.fromJSON`
  - On unload: save settings + cache

- [ ] **Step 1: Test `resolveUrlTarget`**

```ts
expect(resolveUrlTarget({ selection: "https://a.com", cursorUrl: null, clipboard: "" })).toBe("https://a.com");
expect(resolveUrlTarget({ selection: "", cursorUrl: "https://b.com", clipboard: "https://c.com" })).toBe("https://b.com");
expect(resolveUrlTarget({ selection: "nope", cursorUrl: null, clipboard: "https://c.com" })).toBe("https://c.com");
```

- [ ] **Step 2–4: Implement settings tab (NestNote `Setting` pattern), commands, wire paste handler registration in `onload`**

Forced parser commands call `parseForced` with Local or MicroLink only; on error `new Notice(t("notice.parseFailed"))`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/settings-tab.ts src/main.ts tests/resolve-url-target.test.ts
git commit -m "feat: settings tab and embed commands"
```

---

### Task 12: build.sh, CI, README

**Files:**
- Create: `build.sh`, `.github/workflows/release.yml`, `README.md`, `README_zh.md`
- Modify: root README currently one-liner — replace with NestNote-structured docs

**Interfaces:**
- Produces: `./build.sh` writes `./embed-link/{main.js,manifest.json,styles.css}`; `./build.sh clean` removes artifacts; release workflow on tags

- [ ] **Step 1: Add `build.sh`** (adapt NestNote: staging dir, backup, `embed-link` folder name, English or Chinese success message OK)

- [ ] **Step 2: Add `.github/workflows/release.yml`** from NestNote (test, tsc, build, draft release assets `main.js` `manifest.json` `styles.css`)

- [ ] **Step 3: Write README.md + README_zh.md** chapters aligned with NestNote: Install, Usage (paste URL / paste file / commands / card actions), Settings table, Embed format, Development (`build.sh`, tests), Publish (tag = version, no `v`)

- [ ] **Step 4: Verify locally**

```bash
npm test
npx tsc --noEmit
npm run build
./build.sh
```

Expected: tests pass; `./embed-link/` contains three files.

On Windows use Git Bash/WSL for `./build.sh`.

- [ ] **Step 5: Commit**

```bash
git add build.sh .github/workflows/release.yml README.md README_zh.md
git commit -m "docs: add README pair, build.sh, and release workflow"
```

---

## Manual verification checklist (after Task 12)

1. Install `./embed-link/` into a vault’s `.obsidian/plugins/embed-link/`, enable plugin.
2. Empty line, paste URL, auto-embed off → menu shows three options; each works.
3. Non-empty line paste URL → default Obsidian paste.
4. Auto-embed on → URL becomes embed card without menu.
5. Paste PDF → filename wiki link menu / auto behavior.
6. Paste image/mp3/mp4 → Obsidian default.
7. Card hover: Edit (source), Delete, Copy, Refresh positions correct.
8. Switch Obsidian language zh/en → UI strings follow.
9. Desktop drop file behaves like paste; mobile only paste.

---

## Spec coverage (self-review)

| Spec section | Task(s) |
|--------------|---------|
| Goals / non-goals | Global + Tasks 6–7, 10 |
| Identity / platform | Tasks 1, 10–11 |
| Architecture folders | File Structure + all tasks |
| Paste/drop rules | Tasks 3, 10 |
| Embed format + hover UX | Tasks 4, 9 |
| Parsers Local/MicroLink | Tasks 6–7 |
| Commands | Task 11 |
| Settings + path separation | Tasks 2, 8, 11 |
| Cache | Task 8 |
| i18n + README | Tasks 2, 12 |
| build.sh / Actions | Task 12 |
| Tests focus | Tasks 3–8, 10–11 |

**Placeholder scan:** none intentional.  
**Type consistency:** `EmbedData` / `ParsedLinkData` — map `aspectRatio` number→string at serialize boundary in `src/embed/insert.ts`.
