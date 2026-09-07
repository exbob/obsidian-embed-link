# Embed Link

[English](README.md) | [中文](README_zh.md)

Embed Link is an [Obsidian](https://obsidian.md/) plugin that turns pasted (and on desktop, dropped) URLs and non-media files into **web page cards**, **video previews**, Markdown links, or filename wiki links.

- **Display name:** Embed Link
- **Plugin ID:** `embed-link`
- **Minimum Obsidian version:** 1.7.2
- **License:** [GPL-3.0](LICENSE)
- **UI language:** Follows the Obsidian app language. Codes that start with `zh` use Simplified Chinese; every other language uses English.

## Install

This plugin is not in the community plugin directory yet. Install a GitHub release or a local build:

1. Download `main.js`, `manifest.json`, and `styles.css` from a [release](https://github.com/exbob/obsidian-embed-link/releases), or copy them from `./embed-link/` after `./build.sh`.
2. Put those three files in your vault at `.obsidian/plugins/embed-link/`.
3. In Obsidian, turn off Restricted mode, then enable **Embed Link** under **Settings → Community plugins**.

To build from source, see [Development](#development).

## Usage

Paste and drop run in Markdown editor views. Desktop intercepts both paste and drop. Mobile intercepts paste only (no file drop).

The plugin handles a **single URL** on an **empty line**, or a **single non-media file**. Image, audio, and video files, multiple files, mixed clipboard content, and URLs on a non-empty line are left to Obsidian.

### Paste a URL

On an empty line, paste (or drop, on desktop) one `http://` or `https://` URL.

With **Auto embed on paste** off, a menu appears (labels follow the app language):

| English | 中文 | Result |
| ------- | ---- | ------ |
| Web page card | 网页卡片 | An `embed` code block rendered as a card |
| Video preview | 视频预览 | `![title](url)` (title from parse, or hostname) |
| Markdown link | Markdown 链接 | `[title](url)` |
| Plain text | 纯文本 | The raw URL |

With **Auto embed on paste** on, a web page card is inserted immediately (no menu). Video preview stays menu-only.

Pasting a URL on a line that already has text does **not** intercept; Obsidian keeps the raw URL.

### Paste a file

Paste (or drop, on desktop) a single non-media file such as a PDF or `.docx`. Image, audio, and video files are not intercepted.

With auto embed off, a menu appears:

| English | 中文 | Result |
| ------- | ---- | ------ |
| Filename link | 文件名链接 | Copy into Obsidian’s default attachment folder; insert `[[path\|filename.ext]]` |
| Default link | 默认链接 | Obsidian’s normal attachment link for that file |

With auto embed on, a filename link is created immediately.

Copied files always use Obsidian’s default attachment folder, not the plugin image folder. Name conflicts get a numeric suffix (for example `report 1.pdf`).

### Commands

Command palette names (prefixed with `Embed Link:`). Bind them under **Settings → Hotkeys**.

| Command | What it does |
| ------- | ------------ |
| Create web page card | Resolve a URL, then insert a web page card (Local parser, MicroLink fallback) |
| Create web page card (local parser) | Same, Local parser only (no fallback) |
| Create web page card (MicroLink parser) | Same, MicroLink only (no fallback) |

URL resolve order: selected text if it is an `http(s)` URL → whitespace token under the cursor → clipboard text. On parse failure, a notice is shown.

### Card actions

Hover a web page card:

| Position | Control | Behavior |
| -------- | ------- | -------- |
| Top-right | **Edit** | Switch that `embed` block to editable source; leave the editor to restore the preview |
| Bottom-right (left → right) | **Delete** | Confirm, then remove the block |
| | **Copy** | Copy the embed source to the clipboard |
| | **Refresh** | Re-parse the URL and update the block |

## Settings

Under Obsidian **Settings → Embed Link**:

| Setting | Default | Description |
| ------- | ------- | ----------- |
| Auto embed on paste | off | On an empty line, insert a web page card or filename wiki link immediately instead of showing a menu |
| Download images to vault | off | Save card preview images in the vault instead of hotlinking |
| Image folder path | empty | Folder for downloaded card images. Empty uses Obsidian’s default attachment path |
| Keep image aspect ratio | on | Preserve the original aspect ratio of card preview images |
| Use parser cache | on | Cache parsed URL metadata for repeat embeds and refreshes |
| Show favicon | on | Show the site favicon on cards when available |
| MicroLink API key | empty | Optional key for the MicroLink parser. Empty uses the free tier |

Parser order is fixed: Local first, then MicroLink. There is no setting to swap engines. Cache is stored with plugin data; when cache is off, it is neither read nor written.

## Development

For people who change the code, install locally, or publish a release. Plugin users can skip this chapter.

### Build from source

Requires Node.js 18 or later.

```bash
git clone https://github.com/exbob/obsidian-embed-link.git
cd obsidian-embed-link
npm install
./build.sh
```

Then copy `embed-link/` into the vault at `.obsidian/plugins/embed-link/`. That directory contains `main.js`, `manifest.json`, and `styles.css`. Enable **Embed Link** under **Settings → Community plugins**.

`./build.sh clean` only deletes `main.js`, `main.js.map` (if present), and `./embed-link/`. It does not build. `./build.sh` and `bash build.sh` are the same.

**Windows:** PowerShell cannot run `./build.sh` directly. Use Git Bash or WSL.

- **Git Bash** (`C:\Program Files\Git\usr\bin\bash.exe`): use the same Node 18+ as PowerShell (typically `/c/Program Files/nodejs`). This repo’s `build.sh` invokes `node esbuild.config.mjs production` so it does not depend on the Windows `npm` shim (the Unix `npm` file under `C:\Program Files\nodejs` often fails in Git Bash with `No such file or directory`). `npm run build` still works in PowerShell.
- **WSL** (often `C:\Windows\System32\bash.exe`): may have a separate, older Node on `PATH` (for example v12). Prepending `/mnt/c/Program Files/nodejs` does not replace WSL’s `node` (Windows ships `node.exe`, not `node`). Install Node 18+ inside WSL, or run `npm run build` in PowerShell / `./build.sh` in Git Bash instead.

`npm run build` from PowerShell writes `main.js` at the repo root. `./build.sh` runs the same production build and stages `main.js`, `manifest.json`, and `styles.css` into `./embed-link/`.

### Develop and check

```bash
npm run dev       # watch source and rebuild
npm test          # unit / integration tests
npx tsc --noEmit  # typecheck
npm run build     # production build (writes main.js at the repo root only)
./build.sh        # production build and write embed-link/
```

Command IDs registered in code look like `create-web-page-card`. Obsidian prefixes the plugin id (for example `embed-link:create-web-page-card`). Use whatever the command palette actually shows.

### Publish a new version

Bump `version` in `manifest.json` (and `versions.json` / `package.json` as needed), push the code, and create a Git tag that matches the version **exactly**, with **no `v` prefix** (for example `0.1.0`, not `v0.1.0`). Pushing that tag runs GitHub Actions: test, typecheck, production build, then a draft GitHub Release with `main.js`, `manifest.json`, and `styles.css`. See the [Obsidian plugin publishing docs](https://docs.obsidian.md/plugins/releasing/submit-plugin).

### Project layout

```text
build.sh                             # production build into embed-link/; clean removes artifacts only
esbuild.config.mjs                   # bundler config
manifest.json                        # plugin manifest
styles.css                           # web page card styles
embed-link/                          # install directory to copy into a vault
src/
├── main.ts                          # entry, commands, lifecycle
├── types.ts                         # shared types
├── settings.ts                      # settings model and normalization
├── url-target.ts                    # command URL from selection / cursor / clipboard
├── i18n/                            # zh/en copy and t()
├── paste/                           # classify, empty-line, paste/drop router
├── parsers/                         # Local (primary) + MicroLink (fallback)
├── embed/                           # serialize, parse, render, hover actions
├── files/                           # copy non-media files + wiki links
├── cache/                           # parser metadata cache
├── media/                           # download images + aspect ratio
└── ui/                              # URL/file suggest menus, settings tab
tests/                               # Vitest
.github/workflows/release.yml        # tag → draft release
docs/superpowers/specs/              # design notes
```
