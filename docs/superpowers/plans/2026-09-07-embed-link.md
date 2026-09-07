# Embed Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Obsidian plugin (`embed-link`) that intercepts paste/drop of URLs and non-media files and turns them into web page cards, video previews, Markdown links, or filename wiki links per the approved design spec.

**Architecture:** NestNote-style TypeScript project (esbuild, Vitest, i18n, `build.sh`, GitHub release). Selectively port Local/MicroLink parsers and `embed` card rendering from [obsidian-link-embed](https://github.com/Seraphli/obsidian-link-embed); add a unified paste/drop router, suggest menus, file copy → `[[path|name.ext]]`, and card hover actions (edit / delete / copy / refresh).

**Tech Stack:** TypeScript, Obsidian API (`obsidian` npm package), esbuild, Vitest + happy-dom, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-07-embed-link-design.md`

## Global Constraints

- Plugin ID `embed-link`; display name `Embed Link`; author `LiShaocheng`; `minAppVersion` `1.7.2`; `isDesktopOnly` `false`; license GPL-3.0.
- Parsers: Local primary, MicroLink fallback only (no other engines).
- User-facing “网页卡片 / web page card” maps to ` ```embed ` code blocks.
- Desktop: paste + drop; mobile: paste only.
- Non-empty-line URL paste: do not intercept.
- Image / audio / video **files**: do not intercept.
- Release tags match `manifest.json` version with **no `v` prefix**.
- UI strings via i18n (`zh` if Obsidian language starts with `zh`, else `en`).
- Follow TDD: failing test → implement → pass → commit per task.
- Port reference roots (read-only): Link Embed `src/parsers/*`, `src/embedUtils.ts`, `styles.css`, `src/suggest.ts`; NestNote `build.sh`, `.github/workflows/release.yml`, `src/i18n/*`, `package.json`, `esbuild.config.mjs`.

---

## File Structure

```text
package.json
package-lock.json
tsconfig.json
esbuild.config.mjs
vitest.config.ts
manifest.json
versions.json
styles.css
build.sh
.gitignore
.github/workflows/release.yml
README.md
README_zh.md
src/
  main.ts
  settings.ts
  types.ts
  i18n/
    types.ts
    en.ts
    zh.ts
    index.ts
  paste/
    classify.ts
    empty-line.ts
    router.ts
  parsers/
    types.ts
    base.ts
    local.ts
    microlink.ts
    index.ts
  embed/
    serialize.ts
    parse.ts
    processor.ts
    actions.ts
    formats.ts
  files/
    copy.ts
    wiki-link.ts
  cache/
    store.ts
  media/
    download.ts
    aspect-ratio.ts
  ui/
    url-suggest.ts
    file-suggest.ts
    settings-tab.ts
tests/
  obsidian-stub.ts
  i18n-setup.ts
  classify.test.ts
  empty-line.test.ts
  formats.test.ts
  serialize.test.ts
  wiki-link.test.ts
  settings.test.ts
  parsers-fallback.test.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.ts`, `manifest.json`, `versions.json`, `.gitignore`, `styles.css`, `src/main.ts`, `tests/obsidian-stub.ts`, `tests/i18n-setup.ts`, `tests/smoke.test.ts`, `build.sh`, `.github/workflows/release.yml`
- Modify: replace root `README.md` later (Task 11); keep existing `LICENSE`

**Interfaces:**
- Produces: buildable plugin entry `src/main.ts` exporting default `EmbedLinkPlugin`; `npm test` / `npm run build` scripts

- [ ] **Step 1: Write `package.json`**

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

- [ ] **Step 2: Write `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.ts`**

Copy NestNote patterns:
- `tsconfig.json`: `module` ESNext, `target` ES2020, `strict` true, include `src/**/*.ts` and `tests/**/*.ts`
- `esbuild.config.mjs`: entry `src/main.ts`, outfile `main.js`, external `obsidian` + CodeMirror/Lezer packages (same list as NestNote), `development` watch / `production` rebuild+exit
- `vitest.config.ts`: `happy-dom`, alias `obsidian` → `tests/obsidian-stub.ts`, `setupFiles: ["./tests/i18n-setup.ts"]`

- [ ] **Step 3: Write `manifest.json` and `versions.json`**

```json
{
  "id": "embed-link",
  "name": "Embed Link",
  "version": "0.1.0",
  "minAppVersion": "1.7.2",
  "description": "Paste and drop URLs and files as web page cards, video previews, or filename links.",
  "author": "LiShaocheng",
  "authorUrl": "https://shaocheng.li",
  "isDesktopOnly": false
}
```

```json
{
  "0.1.0": "1.7.2"
}
```

- [ ] **Step 4: Write stub plugin + test harness**

`src/main.ts`:

```typescript
import { Plugin } from "obsidian";

export default class EmbedLinkPlugin extends Plugin {
  async onload(): Promise<void> {
    // Wired in later tasks
  }
}
```

`tests/obsidian-stub.ts`: minimal stubs (`Plugin`, `Notice`, `requestUrl`, `EditorSuggest`, `PluginSettingTab`, `MarkdownRenderChild`, `Modal`, `Setting`, `App`, `TFile`, `Vault`, `Platform` with `isMobile: false`). Expand as tests need.

`tests/i18n-setup.ts`: empty for now (or `setLocaleForTests("en")` once i18n exists in Task 2).

`tests/smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import EmbedLinkPlugin from "../src/main";

describe("scaffold", () => {
  it("exports a Plugin subclass", () => {
    expect(typeof EmbedLinkPlugin).toBe("function");
  });
});
```

`styles.css`: start with comment `/* Embed Link styles — filled in Task 7 */`

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

- [ ] **Step 5: Write `build.sh`**

Adapt NestNote `build.sh`: staging dir → `./embed-link/` containing `main.js`, `manifest.json`, `styles.css`. `clean` removes `main.js`, `main.js.map`, `./embed-link/`. Success message: `Embed Link 发布文件已写入 ./embed-link/`.

- [ ] **Step 6: Write `.github/workflows/release.yml`**

Copy NestNote release workflow: on tag `*`, Node 20, `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`, attest `main.js`/`manifest.json`/`styles.css`, `gh release create` draft with those three files. Tag title = tag name (no `v` prefix convention documented in README later).

- [ ] **Step 7: Install and verify**

Run:

```bash
npm install
npm test
npx tsc --noEmit
npm run build
```

Expected: tests pass; `main.js` created; tsc clean.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json esbuild.config.mjs vitest.config.ts manifest.json versions.json .gitignore styles.css src/main.ts tests build.sh .github
git commit -m "chore: scaffold Embed Link plugin project"
```

---

### Task 2: Settings model and i18n

**Files:**
- Create: `src/settings.ts`, `src/types.ts`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/index.ts`, `tests/settings.test.ts`
- Modify: `tests/i18n-setup.ts`

**Interfaces:**
- Produces:
  - `export interface EmbedLinkSettings { autoEmbed: boolean; downloadImages: boolean; imageFolderPath: string; keepAspectRatio: boolean; useCache: boolean; showFavicon: boolean; microlinkApiKey: string; cache: Record<string, unknown>; }`
  - `export const DEFAULT_SETTINGS: EmbedLinkSettings`
  - `export function normalizeSettings(raw: unknown): EmbedLinkSettings`
  - `t(key: MessageKey, vars?: Record<string, string | number>): string`
  - `setLocaleForTests(locale: UiLocale): void`

- [ ] **Step 1: Write failing settings tests**

```typescript
import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
  it("fills defaults for empty object", () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("preserves known booleans and strings", () => {
    const s = normalizeSettings({
      autoEmbed: true,
      imageFolderPath: "assets/embeds",
      microlinkApiKey: "abc",
    });
    expect(s.autoEmbed).toBe(true);
    expect(s.imageFolderPath).toBe("assets/embeds");
    expect(s.microlinkApiKey).toBe("abc");
    expect(s.downloadImages).toBe(false);
  });

  it("coerces invalid types back to defaults", () => {
    expect(normalizeSettings({ autoEmbed: "yes" }).autoEmbed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`Cannot find module '../src/settings'`)

Run: `npm test -- tests/settings.test.ts`

- [ ] **Step 3: Implement settings + i18n**

`DEFAULT_SETTINGS`:

```typescript
export const DEFAULT_SETTINGS: EmbedLinkSettings = {
  autoEmbed: false,
  downloadImages: false,
  imageFolderPath: "",
  keepAspectRatio: true,
  useCache: true,
  showFavicon: true,
  microlinkApiKey: "",
  cache: {},
};
```

Port NestNote `src/i18n/index.ts` pattern (`resolveLocale`, `detectLanguage`, `t`, `setLocaleForTests`). Message keys (minimum for later tasks — add all strings now to avoid churn):

- URL menu: `urlMenu.webPageCard`, `urlMenu.videoPreview`, `urlMenu.markdownLink`, `urlMenu.plainText`
- File menu: `fileMenu.filenameLink`, `fileMenu.defaultLink`
- Settings labels/descriptions for each setting
- Commands: `command.createWebPageCard`, `command.createWebPageCardLocal`, `command.createWebPageCardMicrolink`
- Card tooltips: `card.edit`, `card.delete`, `card.copy`, `card.refresh`
- Notices: `notice.parseFailed`, `notice.deleteConfirm`, `notice.copied`
- Delete confirm modal: `modal.deleteTitle`, `modal.deleteConfirm`, `modal.cancel`

English and Chinese catalogs must share the same keys.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- tests/settings.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts src/types.ts src/i18n tests/settings.test.ts tests/i18n-setup.ts
git commit -m "feat: add settings model and i18n catalogs"
```

---

### Task 3: Paste content classification

**Files:**
- Create: `src/paste/classify.ts`, `src/paste/empty-line.ts`, `tests/classify.test.ts`, `tests/empty-line.test.ts`

**Interfaces:**
- Produces:
  - `export type PasteKind = "url" | "non-media-file" | "ignore"`
  - `export function classifyClipboardText(text: string): { kind: "url"; url: string } | { kind: "ignore" }`
  - `export function classifyDroppedOrPastedFile(file: { name: string; type: string }): PasteKind` — returns `"non-media-file"` or `"ignore"`
  - `export function isEmptyEditorLine(lineText: string, cursorCh: number, insertedLength: number): boolean` — true when insertion starts at column 0 and the line had only whitespace (or was empty) aside from the inserted URL

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { classifyClipboardText, classifyDroppedOrPastedFile } from "../src/paste/classify";
import { isEmptyEditorLine } from "../src/paste/empty-line";

describe("classifyClipboardText", () => {
  it("accepts a single http(s) URL", () => {
    expect(classifyClipboardText("https://example.com/a")).toEqual({
      kind: "url",
      url: "https://example.com/a",
    });
  });

  it("ignores multiline or extra text", () => {
    expect(classifyClipboardText("https://a.com\nhttps://b.com").kind).toBe("ignore");
    expect(classifyClipboardText("see https://a.com").kind).toBe("ignore");
  });
});

describe("classifyDroppedOrPastedFile", () => {
  it("ignores image audio video", () => {
    expect(classifyDroppedOrPastedFile({ name: "a.png", type: "image/png" })).toBe("ignore");
    expect(classifyDroppedOrPastedFile({ name: "a.mp3", type: "audio/mpeg" })).toBe("ignore");
    expect(classifyDroppedOrPastedFile({ name: "a.mp4", type: "video/mp4" })).toBe("ignore");
  });

  it("handles pdf as non-media", () => {
    expect(classifyDroppedOrPastedFile({ name: "doc.pdf", type: "application/pdf" })).toBe(
      "non-media-file",
    );
  });
});

describe("isEmptyEditorLine", () => {
  it("true when URL pasted at start of empty line", () => {
    expect(isEmptyEditorLine("https://x.com", 12, 12)).toBe(true);
  });

  it("false when pasted mid-line", () => {
    expect(isEmptyEditorLine("hi https://x.com", 15, 12)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/classify.test.ts tests/empty-line.test.ts`

- [ ] **Step 3: Implement**

URL regex: trimmed single token matching `^https?:\/\/\S+$/i` (no spaces).  
Media extensions (case-insensitive): images `png jpg jpeg gif webp svg bmp ico`, audio `mp3 wav ogg m4a flac aac`, video `mp4 webm mov mkv avi m4v`. Also ignore when `type` starts with `image/`, `audio/`, or `video/`.

`isEmptyEditorLine`: `startCh = cursorCh - insertedLength`; require `startCh === 0` and `lineText.slice(0, startCh).trim() === ""` and after removing the inserted segment the remaining line is blank/whitespace-only — for paste-after-insert, simpler rule matching Link Embed: `cursor.ch - url.length === 0` on that line (URL occupies from column 0).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/paste tests/classify.test.ts tests/empty-line.test.ts
git commit -m "feat: classify paste URL and non-media files"
```

---

### Task 4: Markdown / embed text formats

**Files:**
- Create: `src/embed/formats.ts`, `src/embed/serialize.ts`, `src/embed/parse.ts`, `src/files/wiki-link.ts`, `tests/formats.test.ts`, `tests/serialize.test.ts`, `tests/wiki-link.test.ts`

**Interfaces:**
- Produces:
  - `export interface WebPageCardData { title: string; image: string; description: string; url: string; favicon?: string; aspectRatio?: number; }`
  - `export function serializeEmbedBlock(data: WebPageCardData): string`
  - `export function parseEmbedBlock(source: string): WebPageCardData | null`
  - `export function formatVideoPreview(title: string, url: string): string` → `![title](url)`
  - `export function formatMarkdownLink(title: string, url: string): string` → `[title](url)`
  - `export function formatFilenameWikiLink(path: string, fileNameWithExt: string): string` → `[[path|fileNameWithExt]]`
  - `export function titleOrHostname(title: string, url: string): string`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  formatVideoPreview,
  formatMarkdownLink,
  titleOrHostname,
} from "../src/embed/formats";
import { serializeEmbedBlock, parseEmbedBlock } from "../src/embed/serialize";
import { formatFilenameWikiLink } from "../src/files/wiki-link";

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

describe("embed serialize/parse", () => {
  it("round-trips fields", () => {
    const data = {
      title: 'Say "Hi"',
      image: "https://img/a.png",
      description: "Hello",
      url: "https://example.com",
      favicon: "https://example.com/f.ico",
      aspectRatio: 1.5,
    };
    const block = serializeEmbedBlock(data);
    expect(block.startsWith("```embed\n")).toBe(true);
    expect(parseEmbedBlock(block.replace(/^```embed\n/, "").replace(/\n```$/, ""))).toEqual(
      data,
    );
  });
});

describe("wiki-link", () => {
  it("uses full filename with extension as alias", () => {
    expect(formatFilenameWikiLink("Attachments/report.pdf", "report.pdf")).toBe(
      "[[Attachments/report.pdf|report.pdf]]",
    );
  });
});
```

Note: `parseEmbedBlock` should accept the **inner** source passed to `MarkdownCodeBlockProcessor` (without fences). Adjust the round-trip test accordingly — serialize may return full fenced block for editor insert; add `serializeEmbedInner` / or strip fences in test.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Serialize like Link Embed YAML-ish lines:

```text
title: "..."
image: "..."
description: "..."
url: "..."
favicon: "..."
aspectRatio: "1.5"
```

Escape quotes in values. Omit empty optional fields (`favicon`, `aspectRatio`) when absent. Escape `]` in titles for Markdown formats if needed (replace `]` or wrap carefully). Prefer minimal escaping: replace `[`/`]` in title with empty or spaces for safety.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/embed/formats.ts src/embed/serialize.ts src/embed/parse.ts src/files/wiki-link.ts tests/formats.test.ts tests/serialize.test.ts tests/wiki-link.test.ts
git commit -m "feat: add embed serialize and link formatters"
```

If `parse.ts` is separate from `serialize.ts`, keep parse in `parse.ts` and re-export from serialize tests imports consistently.

---

### Task 5: Parsers (Local + MicroLink + fallback)

**Files:**
- Create: `src/parsers/types.ts`, `src/parsers/base.ts`, `src/parsers/local.ts`, `src/parsers/microlink.ts`, `src/parsers/index.ts`, `tests/parsers-fallback.test.ts`
- Reference port: Link Embed `src/parsers/parser.ts`, `LocalParser.ts`, `MicroLinkParser.ts`, `src/parsers/utils/*`

**Interfaces:**
- Consumes: `EmbedLinkSettings`, `WebPageCardData`
- Produces:
  - `export type ParserName = "local" | "microlink"`
  - `export async function parseUrl(url: string, options: ParseOptions): Promise<WebPageCardData>`
  - `export async function parseUrlWith(parser: ParserName, url: string, options: ParseOptions): Promise<WebPageCardData>`
  - `ParseOptions`: `{ settings: EmbedLinkSettings; vault: Vault; requestUrl?: typeof requestUrl }` for tests

- [ ] **Step 1: Write failing fallback test with mocked parsers**

Prefer injecting parsers in `parseUrl` for unit test:

```typescript
import { describe, it, expect, vi } from "vitest";
import { parseUrlWithFallback } from "../src/parsers/index";

describe("parseUrlWithFallback", () => {
  it("uses secondary when primary throws", async () => {
    const primary = vi.fn().mockRejectedValue(new Error("local fail"));
    const secondary = vi.fn().mockResolvedValue({
      title: "T",
      image: "",
      description: "",
      url: "https://example.com",
    });
    const result = await parseUrlWithFallback("https://example.com", primary, secondary);
    expect(primary).toHaveBeenCalled();
    expect(secondary).toHaveBeenCalled();
    expect(result.title).toBe("T");
  });

  it("does not call secondary when primary succeeds", async () => {
    const primary = vi.fn().mockResolvedValue({
      title: "A",
      image: "",
      description: "",
      url: "https://example.com",
    });
    const secondary = vi.fn();
    await parseUrlWithFallback("https://example.com", primary, secondary);
    expect(secondary).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Port and simplify parsers**

1. Port `MicroLinkParser`: API `https://api.microlink.io?url=...`. If `settings.microlinkApiKey` non-empty, send `headers: { "x-api-key": key }` (MicroLink documented header) or query param if that matches current MicroLink docs — verify against current MicroLink API when implementing; if free-tier URL-only works without key, keep key optional.
2. Port `LocalParser`: fetch HTML via `requestUrl`, extract og:title / title / og:image / description / favicon. Strip Link Embed plugin-global coupling (`window.app.plugins...`).
3. Replace Mustache with simple `api.replace("{{{url}}}", encodeURIComponent(url))`.
4. Do **not** call `new Notice` on every fetch in unit-testable path; Notices belong in UI layer (main/commands). Parsers throw on failure.
5. Image download + aspect ratio: call into Task 6 helpers when settings say so; if Task 6 not merged yet, stub interfaces and wire in Task 6.

Export:

```typescript
export async function parseUrlWithFallback(
  url: string,
  primary: (url: string) => Promise<WebPageCardData>,
  secondary: (url: string) => Promise<WebPageCardData>,
): Promise<WebPageCardData> {
  try {
    return await primary(url);
  } catch {
    return await secondary(url);
  }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/parsers tests/parsers-fallback.test.ts
git commit -m "feat: add Local and MicroLink parsers with fallback"
```

---

### Task 6: Cache, aspect ratio, image download

**Files:**
- Create: `src/cache/store.ts`, `src/media/download.ts`, `src/media/aspect-ratio.ts`, `tests/cache.test.ts` (optional small), wire into parsers

**Interfaces:**
- Produces:
  - `getCached(settings, key): unknown | undefined` / `setCached(settings, key, value): void` — no-op read/write when `useCache` is false
  - `downloadImageToVault(url, vault, folderPath): Promise<string>` — returns vault path; unique name on conflict (`image 1.png`)
  - `resolveImageFolderPath(settings, app): string` — empty setting → Obsidian attachment folder path for active file / vault config
  - `getAspectRatio(imageUrlOrPath, cache): Promise<number | undefined>`

- [ ] **Step 1: Write a small failing test for cache gate**

```typescript
import { describe, it, expect } from "vitest";
import { getCached, setCached } from "../src/cache/store";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("cache store", () => {
  it("skips when useCache is false", () => {
    const s = { ...DEFAULT_SETTINGS, useCache: false, cache: {} as Record<string, unknown> };
    setCached(s, "k", { a: 1 });
    expect(s.cache).toEqual({});
    expect(getCached(s, "k")).toBeUndefined();
  });

  it("stores when enabled", () => {
    const s = { ...DEFAULT_SETTINGS, useCache: true, cache: {} as Record<string, unknown> };
    setCached(s, "k", { a: 1 });
    expect(getCached(s, "k")).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 2–4: Implement, pass tests, wire parsers to download when `downloadImages` and to set `aspectRatio` when `keepAspectRatio`**

Conflict naming: if `foo.png` exists, try `foo 1.png`, `foo 2.png`, …

Persist `settings.cache` via plugin `saveSettings()` after updates (call site in main when cache mutates).

- [ ] **Step 5: Commit**

```bash
git add src/cache src/media tests/cache.test.ts src/parsers
git commit -m "feat: add favicon and image cache helpers"
```

---

### Task 7: Web page card renderer and hover actions

**Files:**
- Create: `src/embed/processor.ts`, `src/embed/actions.ts`
- Modify: `styles.css` (port Link Embed card CSS, rename class prefixes to `embed-link-` if needed to avoid clashes)
- Reference: Link Embed `styles.css`, embed HTML builder in `embedUtils.ts` / main processor

**Interfaces:**
- Consumes: `parseEmbedBlock`, `serializeEmbedBlock`, parsers, `t()`
- Produces: `registerEmbedProcessor(plugin: EmbedLinkPlugin): void` registering `registerMarkdownCodeBlockProcessor("embed", ...)`

**UI layout (required):**
- Top-right: Edit
- Bottom-right left→right: Delete, Copy, Refresh

**Behaviors:**
- **Edit:** replace preview with editable `<textarea>` (or contenteditable) showing full fenced/inner source; on blur or explicit done, write back into the note’s code block via editor/file mutation, then re-render. Prefer mutating the markdown source of the active file at the code block range (Link Embed refresh pattern).
- **Delete:** confirm modal (`t("modal.deleteTitle")` etc.), then remove the entire `embed` fence from the file.
- **Copy:** `navigator.clipboard.writeText(fullFencedBlock)` + Notice `notice.copied`.
- **Refresh:** re-parse `url` with fallback parsers; rewrite block; respect settings for images/favicon/aspect.

- [ ] **Step 1: Manual/visual checkpoint is primary; add a unit test for action order CSS class names if useful**

```typescript
// tests/card-actions.test.ts — optional
import { describe, it, expect } from "vitest";
import { CARD_ACTION_ORDER } from "../src/embed/actions";

describe("card actions", () => {
  it("orders bottom actions delete, copy, refresh", () => {
    expect(CARD_ACTION_ORDER).toEqual(["delete", "copy", "refresh"]);
  });
});
```

- [ ] **Step 2: Implement processor + CSS**

Card should show: favicon (if `showFavicon` and present), title, description, image (with aspect ratio CSS when enabled), clickable to open URL.

Respect `showFavicon` from settings at render time.

- [ ] **Step 3: Run unit tests + `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add src/embed/processor.ts src/embed/actions.ts styles.css tests/card-actions.test.ts
git commit -m "feat: render web page cards with edit delete copy refresh"
```

---

### Task 8: File copy and filename wiki links

**Files:**
- Create: `src/files/copy.ts`
- Modify: `src/files/wiki-link.ts` (already exists)
- Test: `tests/wiki-link.test.ts` (extend), `tests/copy-path.test.ts` for unique name helper

**Interfaces:**
- Produces:
  - `export function uniquePath(folder: string, fileName: string, exists: (path: string) => boolean): string`
  - `export async function copyFileIntoAttachments(app: App, file: File | ArrayBuffer & { name: string }): Promise<{ path: string; fileName: string }>`
  - Always target Obsidian default attachment folder (`app.fileManager.getAvailablePathForAttachment` preferred when available — use Obsidian API to place attachment for the active file). Do **not** use plugin `imageFolderPath` here.

- [ ] **Step 1: Test `uniquePath`**

```typescript
import { describe, it, expect } from "vitest";
import { uniquePath } from "../src/files/copy";

describe("uniquePath", () => {
  it("adds numeric suffix before extension", () => {
    const exists = (p: string) => p === "Att/a.pdf" || p === "Att/a 1.pdf";
    expect(uniquePath("Att", "a.pdf", exists)).toBe("Att/a 2.pdf");
  });
});
```

- [ ] **Step 2–4: Implement, pass, commit**

```bash
git commit -m "feat: copy non-media files into attachment folder"
```

---

### Task 9: Suggest menus and paste/drop router

**Files:**
- Create: `src/ui/url-suggest.ts`, `src/ui/file-suggest.ts`, `src/paste/router.ts`
- Modify: `src/main.ts` (register handlers)

**Interfaces:**
- Produces:
  - `registerPasteDropRouter(plugin): void`
  - URL suggest choices in order: web page card, video preview, markdown link, plain text
  - File suggest: filename link, default link
  - `pasteInfo` flag pattern from Link Embed `suggest.ts` (trigger EditorSuggest after paste inserts URL)

**Logic:**

1. On `editor-paste` / `drop` (desktop): classify.
2. URL + empty line + `autoEmbed` → parse + insert embed block (replace pasted URL range).
3. URL + empty line + !`autoEmbed` → allow default paste of URL, set `pasteInfo.trigger`, open URL suggest.
4. URL + non-empty → return (no preventDefault).
5. Non-media file + `autoEmbed` → preventDefault, copy, insert wiki link.
6. Non-media file + !`autoEmbed` → preventDefault, show file suggest; on **filename link**, run `copyFileIntoAttachments` + insert `formatFilenameWikiLink`. On **default link**, use Obsidian’s attachment API for the active file: `await app.fileManager.getAvailablePathForAttachment(fileName, activeFile)` then `vault.createBinary` / `create` as appropriate, then insert the link Obsidian would normally insert via `app.fileManager.generateMarkdownLink(createdFile, activeFile.path)` (this re-applies default link style without re-firing the original DOM event).
7. Mobile: register paste only; skip drop (`Platform.isMobile`).
8. Selecting “plain text”: leave URL as-is (already pasted).
9. Video preview / markdown link: parse title (fallback hostname), replace URL range with formatted string.

- [ ] **Step 1: Add router decision unit tests (pure function)**

```typescript
// src/paste/decide.ts
export type UrlAction =
  | { type: "auto-card" }
  | { type: "show-url-menu" }
  | { type: "ignore" };

export function decideUrlPaste(opts: {
  autoEmbed: boolean;
  emptyLine: boolean;
}): UrlAction {
  if (!opts.emptyLine) return { type: "ignore" };
  if (opts.autoEmbed) return { type: "auto-card" };
  return { type: "show-url-menu" };
}
```

Test all three branches.

- [ ] **Step 2–4: Implement suggest + router, wire in `onload`, commit**

```bash
git commit -m "feat: intercept paste and drop with suggest menus"
```

---

### Task 10: Commands, settings tab, plugin wiring

**Files:**
- Create: `src/ui/settings-tab.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Commands (IDs):
  - `embed-link:create-web-page-card`
  - `embed-link:create-web-page-card-local`
  - `embed-link:create-web-page-card-microlink`
- Resolve URL order: selection if looks like URL → cursor token → clipboard text
- Forced parser commands: no fallback; `Notice(t("notice.parseFailed"))` on error
- Settings tab: toggles/inputs for all settings from spec; save on change

- [ ] **Step 1: Implement settings tab + commands in `main.ts`**

`onload` order:
1. `loadData` → `normalizeSettings`
2. register embed processor
3. register paste/drop router
4. register suggests
5. register commands
6. `addSettingTab`

`onunload`: nothing special beyond Obsidian defaults.

- [ ] **Step 2: `npx tsc --noEmit` && `npm test`**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: wire commands and settings tab"
```

---

### Task 11: README, build verification, smoke checklist

**Files:**
- Create: `README.md`, `README_zh.md`
- Modify: ensure `build.sh` executable semantics documented for Windows (Git Bash/WSL)

**README chapters (NestNote-aligned):** Install → Usage (paste URL / paste file / commands / card actions) → Settings table → Development (`npm`, `./build.sh`) → Publish (tag = version, no `v`) → Project layout.

- [ ] **Step 1: Write bilingual READMEs**

- [ ] **Step 2: Full verify**

```bash
npm test
npx tsc --noEmit
npm run build
bash build.sh
```

Expected: `./embed-link/main.js`, `manifest.json`, `styles.css` present.

Manual Obsidian checklist (document in PR/commit body, run locally if vault available):
1. Paste URL on empty line → four menu items with Chinese/English labels
2. Auto embed on → card without menu
3. Paste URL mid-line → raw URL
4. Paste PDF → filename link / default
5. Paste image → Obsidian default
6. Card hover: edit (source), delete, copy, refresh positions

- [ ] **Step 3: Commit**

```bash
git add README.md README_zh.md
git commit -m "docs: add Embed Link README in English and Chinese"
```

---

## Spec coverage checklist (self-review)

| Spec item | Task |
|-----------|------|
| Web page card + embed format | 4, 7 |
| Video preview `![title](url)` | 4, 9 |
| Markdown link + plain text | 4, 9 |
| Auto embed on/off | 2, 9 |
| Empty vs non-empty line | 3, 9 |
| Non-media file wiki link | 4, 8, 9 |
| Ignore image/audio/video files | 3, 9 |
| Local + MicroLink + API key | 2, 5 |
| Download images + path + aspect + cache + favicon | 2, 6, 7 |
| Card edit/delete/copy/refresh layout | 7 |
| Commands | 10 |
| i18n zh/en | 2, 10 |
| build.sh + GH release | 1, 11 |
| Desktop drop + mobile paste only | 9 |
| README pair | 11 |

**Out of scope (do not implement):** other parsers, MD-link favicons, metadata templates, mobile drop, community directory submission.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-09-07-embed-link.md`.
