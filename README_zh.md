# Embed Link

[English](README.md) | [中文](README_zh.md)

Embed Link 是一个 [Obsidian](https://obsidian.md/) 插件：把粘贴（以及桌面上的拖放）的 URL 和非媒体文件，变成 **网页卡片**、**视频预览**、Markdown 链接或文件名 wiki 链接。

- **显示名称：** Embed Link
- **插件 ID：** `embed-link`
- **最低 Obsidian 版本：** 1.7.2
- **许可证：** [GPL-3.0](LICENSE)
- **界面语言：** 跟随 Obsidian 应用语言。语言代码以 `zh` 开头时使用简体中文，其他语言使用英文。

## 安装

本插件尚未进入社区插件目录。请从 GitHub Release 或本地构建安装：

1. 从 [Release](https://github.com/exbob/obsidian-embed-link/releases) 下载 `main.js`、`manifest.json`、`styles.css`，或在执行 `./build.sh` 后从 `./embed-link/` 复制。
2. 把这三个文件放到库的 `.obsidian/plugins/embed-link/`。
3. 在 Obsidian 中关闭受限模式，然后在 **设置 → 社区插件** 中启用 **Embed Link**。

从源码构建见 [开发说明](#开发说明)。

## 使用说明

粘贴和拖放只作用于 Markdown 编辑器视图。桌面端拦截粘贴和拖放；移动端只拦截粘贴（不支持文件拖放）。

插件处理的是 **空行上的单个 URL**，或 **单个非媒体文件**。图片 / 音频 / 视频文件、多个文件、混合剪贴板内容，以及非空行上的 URL，都交给 Obsidian 处理。

### 粘贴 URL

在空行粘贴（桌面端也可拖放）一个 `http://` 或 `https://` URL。

**粘贴时自动嵌入** 关闭时，会出现菜单（文案跟随应用语言）：

| 中文 | English | 结果 |
| ---- | ------- | ---- |
| 网页卡片 | Web page card | `embed` 代码块，渲染为卡片 |
| 视频预览 | Video preview | `![title](url)`（标题来自解析结果，失败则用主机名） |
| Markdown 链接 | Markdown link | `[title](url)` |
| 纯文本 | Plain text | 原始 URL |

**粘贴时自动嵌入** 开启时，直接插入网页卡片（不出现菜单）。视频预览只能从菜单选择。

在已有文字的行上粘贴 URL **不会拦截**，Obsidian 会保留原始 URL。

### 粘贴文件

粘贴（桌面端也可拖放）单个非媒体文件，例如 PDF 或 `.docx`。图片、音频、视频文件不会被拦截。

自动嵌入关闭时，会出现菜单：

| 中文 | English | 结果 |
| ---- | ------- | ---- |
| 文件名链接 | Filename link | 复制到 Obsidian 默认附件文件夹，插入 `[[path\|filename.ext]]` |
| 默认链接 | Default link | 使用 Obsidian 对该文件的默认附件链接 |

自动嵌入开启时，直接创建文件名链接。

复制文件始终使用 Obsidian 的默认附件文件夹，不用插件的图片文件夹。文件名冲突会加数字后缀（例如 `report 1.pdf`）。

### 命令

命令面板中的名称（前面带 `Embed Link:`）。可在 **设置 → 快捷键** 里绑定。

| 命令 | 作用 |
| ---- | ---- |
| 创建网页卡片 | 解析 URL，插入网页卡片（本地解析，失败则 MicroLink） |
| 创建网页卡片（本地解析） | 同上，仅本地解析（不回退） |
| 创建网页卡片（MicroLink 解析） | 同上，仅 MicroLink（不回退） |

URL 解析顺序：选中文本若是 `http(s)` URL → 光标所在空白分隔的 token → 剪贴板文本。解析失败会弹出提示。

### 卡片操作

将鼠标悬停在网页卡片上：

| 位置 | 控件 | 行为 |
| ---- | ---- | ---- |
| 右上角 | **编辑** | 把该 `embed` 块切成可编辑源码；离开编辑器后恢复预览 |
| 右下角（从左到右） | **删除** | 确认后删除该块 |
| | **复制** | 把 embed 源码复制到剪贴板 |
| | **刷新** | 重新解析 URL 并更新该块 |

## 设置

在 Obsidian **设置 → Embed Link** 中：

| 设置项 | 默认 | 说明 |
| ------ | ---- | ---- |
| 粘贴时自动嵌入 | 关 | 在空行直接插入网页卡片或文件名 wiki 链接，不显示菜单 |
| 下载图片到仓库 | 关 | 把卡片预览图保存进库，而不是用外链 |
| 图片文件夹路径 | 空 | 下载的卡片图片存放目录。留空则用 Obsidian 默认附件路径 |
| 保持图片宽高比 | 开 | 在网页卡片上保持预览图的原始宽高比 |
| 使用解析缓存 | 开 | 缓存已解析的 URL 元数据，加快重复嵌入和刷新 |
| 显示网站图标 | 开 | 在卡片上显示站点 favicon（如有） |
| MicroLink API 密钥 | 空 | MicroLink 解析器的可选密钥。留空则使用免费额度 |

解析顺序固定：先本地，再 MicroLink。没有切换引擎的设置。缓存在插件数据里；关闭缓存时既不读也不写。

## 开发说明

面向要改代码、本地安装或发版的人。插件用户可以忽略本章。

### 从源码构建

需要 Node.js 18 或更高版本。

```bash
git clone https://github.com/exbob/obsidian-embed-link.git
cd obsidian-embed-link
npm install
./build.sh
```

成功后把 `embed-link/` 复制到库的 `.obsidian/plugins/embed-link/`。该目录含 `main.js`、`manifest.json`、`styles.css`。再在 **设置 → 社区插件** 中启用 **Embed Link**。

`./build.sh clean` 只删除 `main.js`、`main.js.map`（若存在）和 `./embed-link/`，不构建。`./build.sh` 与 `bash build.sh` 相同。

**Windows：** PowerShell 不能直接跑 `./build.sh`，请用 Git Bash 或 WSL。

- **Git Bash**（`C:\Program Files\Git\usr\bin\bash.exe`）：使用与 PowerShell 相同的 Node 18+（一般是 `/c/Program Files/nodejs`）。本仓库的 `build.sh` 直接执行 `node esbuild.config.mjs production`，不依赖 Windows 的 `npm` Unix 垫片（`C:\Program Files\nodejs\npm` 在 Git Bash 里常报 `No such file or directory`）。PowerShell 里的 `npm run build` 仍然可用。
- **WSL**（常见为 `C:\Windows\System32\bash.exe`）：`PATH` 里可能是另一套旧 Node（例如 v12）。把 `/mnt/c/Program Files/nodejs` 放到前面也换不掉 WSL 的 `node`（Windows 提供的是 `node.exe`）。请在 WSL 内安装 Node 18+，或改在 PowerShell 跑 `npm run build` / 在 Git Bash 跑 `./build.sh`。

在 PowerShell 执行 `npm run build` 会在仓库根目录生成 `main.js`。`./build.sh` 会跑同一套生产构建，并把 `main.js`、`manifest.json`、`styles.css` 放到 `./embed-link/`。

### 开发与检查

```bash
npm run dev       # 监听源码并重新构建
npm test          # 单元 / 集成测试
npx tsc --noEmit  # 类型检查
npm run build     # 生产构建（只生成仓库根目录的 main.js）
./build.sh        # 生产构建并写入 embed-link/
```

命令在代码里注册的 ID 为 `create-web-page-card` 等。Obsidian 会加上插件前缀（例如 `embed-link:create-web-page-card`），以命令面板实际显示为准。

### 发布新版本

更新 `manifest.json` 的 `version`（以及需要时的 `versions.json` / `package.json`），推送代码，并创建与版本号 **完全一致**、**不加 `v` 前缀** 的 Git 标签（例如 `0.1.0`，不要写成 `v0.1.0`）。推送该标签后，GitHub Actions 会跑测试、类型检查、生产构建，并用 `main.js`、`manifest.json`、`styles.css` 创建草稿 Release。详见 [Obsidian 插件发布文档](https://docs.obsidian.md/plugins/releasing/submit-plugin)。

### 项目结构

```text
build.sh                             # 生产构建并写入 embed-link/；clean 只清产物
esbuild.config.mjs                   # 打包配置
manifest.json                        # 插件清单
styles.css                           # 网页卡片样式
embed-link/                          # 可复制到库的安装目录
src/
├── main.ts                          # 入口、命令、生命周期
├── types.ts                         # 共享类型
├── settings.ts                      # 设置模型与规范化
├── url-target.ts                    # 从选区 / 光标 / 剪贴板取命令 URL
├── i18n/                            # 中英文案与 t()
├── paste/                           # 分类、空行、粘贴/拖放路由
├── parsers/                         # 本地解析（主）+ MicroLink（回退）
├── embed/                           # 序列化、解析、渲染、悬停操作
├── files/                           # 复制非媒体文件 + wiki 链接
├── cache/                           # 解析元数据缓存
├── media/                           # 下载图片与宽高比
└── ui/                              # URL/文件建议菜单、设置页
tests/                               # Vitest
.github/workflows/release.yml        # 标签 → 草稿 Release
docs/superpowers/specs/              # 设计说明
```
