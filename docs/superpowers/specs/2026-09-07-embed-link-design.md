# Embed Link — Design Spec

**Date:** 2026-09-07  
**Status:** Approved for implementation planning  
**Plugin ID:** `embed-link`  
**Display name:** Embed Link  
**Approach:** NestNote project skeleton + selectively port Link Embed cores (Local/MicroLink parsers, `embed` code-block render, paste suggest UI), then add unified paste/drop routing and non-media file linking.

## 1. Goals

Make pasting (and on desktop, dropping) URLs and non-media files into Obsidian notes produce more readable results:

- URLs → embed preview cards (same source format / visual style as [obsidian-link-embed](https://github.com/seraphli/obsidian-link-embed)), Markdown links, or plain text.
- Non-image / non-audio / non-video files → `[[path|filename.ext]]` or Obsidian default paste/drop.
- Everything else → leave to Obsidian (no interception).

## 2. Non-goals

- Extra metadata parsers (JSONLink, Iframely, LinkPreview, etc.)
- Favicons on ordinary Markdown links
- Metadata template / custom metadata fields beyond the embed block fields listed below
- Converting legacy HTML embeds from older Link Embed versions
- Drag-and-drop on mobile
- Auto-submitting to the Obsidian community plugin directory

## 3. Identity & platform

| Field | Value |
|-------|-------|
| `id` | `embed-link` |
| `name` | Embed Link |
| `author` | LiShaocheng (same as NestNote) |
| `isDesktopOnly` | `false` |
| `minAppVersion` | `1.7.2` |
| License | GPL-3.0 (existing repo LICENSE) |

- **Desktop:** intercept paste and drop.
- **Mobile:** paste only; file drop not supported.

## 4. Architecture

Project layout mirrors [obsidian-nest-note](https://github.com/exbob/obsidian-nest-note):

```text
src/
  main.ts                 # entry, commands, lifecycle
  settings.ts             # settings model + defaults
  i18n/                   # en / zh
  paste/                  # paste & drop interception, content classification
  parsers/                # Local (primary) + MicroLink (fallback)
  embed/                  # write/parse/render embed blocks; hover actions
  files/                  # copy non-media files + wiki-link generation
  ui/                     # suggest menus, settings tab
styles.css
build.sh                  # publish into ./embed-link/
.github/workflows/        # tag → draft release
README.md / README_zh.md
tests/
```

**Data flow**

1. Editor paste/drop → `paste/` classifies content.
2. URL on empty line → suggest menu or auto-embed → `parsers/` → write ` ```embed ` block → `embed/` renders.
3. Non-media file → suggest menu or auto filename-link → `files/` copies into Obsidian attachment path → insert `[[path|filename.ext]]`.
4. Other content → do not intercept.

## 5. Paste / drop behavior

### 5.1 When to intercept

| Content | Condition | Action |
|---------|-----------|--------|
| Single URL | Current line is empty | Handle |
| Single URL | Line is not empty | Do not intercept |
| Image / audio / video file | — | Do not intercept |
| Other file (pdf, docx, …) | Single file | Handle |
| Multiple files, plain text, multiline, mixed, etc. | — | Do not intercept |

Applies only in Markdown editor views. Media detection uses common image/audio/video extensions and MIME types.

### 5.2 URL — auto-embed off

Empty-line paste/drop of a URL → suggestion menu:

1. **Create embed preview** — parse with Local, fall back to MicroLink; replace the line with an `embed` code block.
2. **Create Markdown link** — `[title](url)`; title from parse result, or hostname on failure.
3. **Paste as plain text** — keep the raw URL string.

### 5.3 URL — auto-embed on

Create embed preview immediately (no menu).

### 5.4 Non-media file — auto-embed off

Suggestion menu:

1. **Create filename link** — copy file into Obsidian’s default attachment folder; insert `[[file-path|full-filename-with-extension]]` (alias is the full name including extension).
2. **Create default link** — after the menu choice, re-apply Obsidian’s normal paste/drop for that file (because the event was already intercepted to show the menu).

### 5.5 Non-media file — auto-embed on

Always create the filename link (option 1 above).

### 5.6 Name conflicts

When copying/downloading files, if the target name exists, append a numeric suffix (e.g. `image 1.png`).

## 6. Embed format & card UI

### 6.1 Source format

Align with Link Embed (simplified fields):

````markdown
```embed
title: "..."
image: "..."
description: "..."
url: "..."
favicon: "..."
aspectRatio: "..."
```
````

Preview rendering and CSS should match Link Embed’s card look.

### 6.2 Hover actions

| Position | Control | Behavior |
|----------|---------|----------|
| Top-right | **Edit** | Switch the card to editable source of that `embed` block; after editing, restore preview rendering |
| Bottom-right (left → right) | **Delete** | Remove the `embed` block (confirm first) |
| | **Copy** | Copy the embed source block to the clipboard |
| | **Refresh** | Re-parse the URL and update the code block |

## 7. Parsers

- **Primary:** Local (fetch HTML, extract OG/meta).
- **Secondary / fallback:** MicroLink.
- Automatic flow: Local fails → try MicroLink.
- Forced-parser commands: no fallback; show a Notice on failure.
- Settings include **MicroLink API Key** (optional). Empty → free tier.

## 8. Commands

Command palette (basic set):

1. `Embed Link: Embed current URL` — URL from selection, URL under cursor, or clipboard; then embed.
2. `Embed Link: Embed with Local`
3. `Embed Link: Embed with MicroLink`

## 9. Settings

| Setting | Default | Notes |
|---------|---------|-------|
| Auto embed | off | On: URL → embed; non-media file → filename link. Off: show menus |
| Download embed images to vault | off | Download card cover images into vault |
| Image save path | empty | Empty = Obsidian default attachment path; relative paths supported |
| Keep original image aspect ratio | on | Persist/use `aspectRatio` |
| Cache favicons and aspect ratios | on | Cache to reduce repeat work |
| Show website favicon | on | Toggle favicon on cards |
| MicroLink API Key | empty | Optional; free tier if unset |

**Separation of paths**

- **Image save path** — only for downloaded embed cover images (and related cached image assets as needed).
- **Non-media file copies** — always use Obsidian’s default attachment folder setting (not the plugin image path).

**Not in settings:** primary/secondary parser picker UI (fixed Local → MicroLink), metadata templates, concurrency limits, Markdown-link favicons.

### 9.1 Cache

- Cache keys based on URL (and image URL when relevant).
- Stored with plugin data; when “cache” is off, do not read or write cache.

## 10. i18n

- Follow Obsidian app language: Simplified Chinese → zh catalog; everything else → en.
- Cover: settings labels, suggest menu items, command names, Notices, card button tooltips.
- README: English primary (`README.md`) + Chinese companion (`README_zh.md`), chapter structure aligned with NestNote.

## 11. Build & release

- Tooling: TypeScript, esbuild, Vitest (same spirit as NestNote).
- `build.sh` / `build.sh clean`: production build into `./embed-link/` (`main.js`, `manifest.json`, `styles.css`); `clean` only removes artifacts.
- Scripts: `npm run dev`, `npm test`, `npx tsc --noEmit`, `npm run build`.
- GitHub Actions on tag push (`*`): `npm ci` → test → typecheck → build → draft release with `main.js`, `manifest.json`, `styles.css`.
- Tag must equal `manifest.json` `version` exactly (e.g. `0.1.0`, **no `v` prefix**).

## 12. Testing focus

Vitest unit/integration coverage for:

- URL vs file type classification (including image/audio/video exclusions)
- Empty line vs non-empty line
- Auto-embed on/off branches
- Wiki link format `[[path|filename.ext]]`
- Embed code-block serialize / parse
- Settings normalization (empty image path → Obsidian attachment path)

## 13. Implementation strategy

1. Scaffold NestNote-style project (`package.json`, esbuild, `build.sh`, manifest, i18n, CI).
2. Port/adapt Local + MicroLink parsers and embed renderer/CSS from Link Embed; strip unrelated features.
3. Implement paste/drop router + suggest menus for URL and files.
4. Wire settings, cache, image download, hover actions (edit/delete/copy/refresh).
5. Add commands and tests; write README pair; verify `./build.sh` and release workflow.

## 14. Decisions log

| Topic | Decision |
|-------|----------|
| Name / ID | Embed Link / `embed-link` |
| Implementation approach | NestNote skeleton + selective Link Embed port |
| Commands | Paste/drop + basic embed commands |
| Non-empty line URL | Do not intercept |
| Video files | Do not intercept (same as image/audio) |
| Card actions | Edit (top-right); Delete, Copy, Refresh (bottom-right) |
| Edit UX | Edit source of the embed block directly |
| Drag-and-drop | Same as paste on desktop; mobile paste only |
| Platform | Desktop + mobile |
| MicroLink API Key | Configurable setting |
