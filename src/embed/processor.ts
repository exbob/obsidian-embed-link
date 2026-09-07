import {
  Notice,
  setIcon,
  TFile,
  type MarkdownPostProcessorContext,
} from "obsidian";
import type EmbedLinkPlugin from "../main";
import { t, type MessageKey } from "../i18n";
import { parseUrl } from "../parsers";
import {
  CARD_ACTION_ORDER,
  deleteEmbedBlockInMarkdown,
  extractEmbedBlock,
  openDeleteConfirmModal,
  replaceEmbedBlockInMarkdown,
  wrapFencedEmbed,
} from "./actions";
import { parseEmbedBlock } from "./parse";
import { serializeEmbedBlock, type WebPageCardData } from "./serialize";

const ACTION_ICONS: Record<(typeof CARD_ACTION_ORDER)[number], string> = {
  delete: "trash-2",
  copy: "copy",
  refresh: "refresh-cw",
};

const ACTION_LABELS: Record<(typeof CARD_ACTION_ORDER)[number], MessageKey> = {
  delete: "card.delete",
  copy: "card.copy",
  refresh: "card.refresh",
};

export function registerEmbedProcessor(plugin: EmbedLinkPlugin): void {
  plugin.registerMarkdownCodeBlockProcessor("embed", (source, el, ctx) => {
    renderEmbed(plugin, source, el, ctx);
  });
}

function emptyCard(): WebPageCardData {
  return { title: "", image: "", description: "", url: "" };
}

function renderEmbed(
  plugin: EmbedLinkPlugin,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): void {
  el.replaceChildren();
  const data = parseEmbedBlock(source) ?? emptyCard();
  el.appendChild(buildCard(plugin, data, source, el, ctx));
}

function buildCard(
  plugin: EmbedLinkPlugin,
  data: WebPageCardData,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "embed-link-card";

  const edit = createActionButton("embed-link-edit", "pencil", t("card.edit"));
  edit.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    enterEditMode(plugin, source, el, ctx);
  });
  card.appendChild(edit);

  const bottom = document.createElement("div");
  bottom.className = "embed-link-buttons";
  for (const action of CARD_ACTION_ORDER) {
    const button = createActionButton(
      `embed-link-${action}`,
      ACTION_ICONS[action],
      t(ACTION_LABELS[action]),
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleAction(action, plugin, data, source, el, ctx);
    });
    bottom.appendChild(button);
  }
  card.appendChild(bottom);

  const wrapper = document.createElement("div");
  wrapper.className =
    "embed-link-w embed-link-sm embed-link-lc embed-link-ts embed-link-lh14 embed-link-od";

  const frame = document.createElement("div");
  frame.className = "embed-link-wf";

  const imageBox = document.createElement("div");
  imageBox.className = "embed-link-wc";
  if (plugin.settings.keepAspectRatio && data.aspectRatio && data.aspectRatio > 0) {
    imageBox.classList.add("embed-link-wi");
  }

  const imageFrame = document.createElement("div");
  imageFrame.className = "embed-link-e";
  if (plugin.settings.keepAspectRatio && data.aspectRatio && data.aspectRatio > 0) {
    imageFrame.style.aspectRatio = String(data.aspectRatio);
  }

  const imageLink = document.createElement("a");
  imageLink.className = "embed-link-em";
  if (data.url) {
    imageLink.href = data.url;
    imageLink.target = "_blank";
    imageLink.rel = "noopener";
  }

  const cover = document.createElement("div");
  cover.className = "embed-link-c";
  const imageSrc = resolveImageSrc(plugin, data.image);
  if (imageSrc) {
    cover.style.backgroundImage = `url("${cssUrl(imageSrc)}")`;
  }

  imageLink.appendChild(cover);
  imageFrame.appendChild(imageLink);
  imageBox.appendChild(imageFrame);

  const textBox = document.createElement("div");
  textBox.className = "embed-link-wt";

  const text = document.createElement("div");
  text.className = "embed-link-t embed-link-f0 embed-link-ffsa embed-link-fsn embed-link-fwn";

  const titleWrap = document.createElement("div");
  titleWrap.className = "embed-link-th embed-link-f1p embed-link-fsn embed-link-fwb";
  const titleLink = document.createElement("a");
  titleLink.className = "embed-link-thl";
  if (data.url) {
    titleLink.href = data.url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener";
  }
  titleLink.textContent = data.title;
  titleWrap.appendChild(titleLink);

  const description = document.createElement("div");
  description.className = "embed-link-td";
  description.textContent = data.description;

  const footer = document.createElement("div");
  footer.className = "embed-link-tf embed-link-f1m";
  const citation = document.createElement("div");
  citation.className = "embed-link-tc";
  const urlLink = document.createElement("a");
  urlLink.className = "embed-link-tw embed-link-f1m";
  if (data.url) {
    urlLink.href = data.url;
    urlLink.target = "_blank";
    urlLink.rel = "noopener";
  }
  if (plugin.settings.showFavicon && data.favicon) {
    const favicon = document.createElement("img");
    favicon.className = "embed-link-favicon";
    favicon.src = data.favicon;
    favicon.alt = "";
    urlLink.appendChild(favicon);
  }
  const urlText = document.createElement("span");
  urlText.textContent = data.url;
  urlLink.appendChild(urlText);
  citation.appendChild(urlLink);
  footer.appendChild(citation);

  text.append(titleWrap, description, footer);
  textBox.appendChild(text);
  frame.append(imageBox, textBox);
  wrapper.appendChild(frame);
  card.appendChild(wrapper);
  return card;
}

function createActionButton(className: string, icon: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.title = label;
  button.setAttribute("aria-label", label);
  setIcon(button, icon);
  return button;
}

function cssUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function resolveImageSrc(plugin: EmbedLinkPlugin, image: string): string {
  if (!image) {
    return "";
  }
  if (/^(https?:|data:|app:)/i.test(image)) {
    return image;
  }
  const file = plugin.app.vault.getAbstractFileByPath(image);
  if (file instanceof TFile) {
    return plugin.app.vault.getResourcePath(file);
  }
  return image;
}

function enterEditMode(
  plugin: EmbedLinkPlugin,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): void {
  el.replaceChildren();
  const textarea = document.createElement("textarea");
  textarea.className = "embed-link-editor";
  textarea.value = source;
  el.appendChild(textarea);
  textarea.focus();

  let committed = false;
  const commit = () => {
    if (committed) {
      return;
    }
    committed = true;
    void writeEditedSource(plugin, textarea.value, source, el, ctx);
  };

  textarea.addEventListener("blur", commit);
  textarea.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      textarea.blur();
    }
  });
}

async function writeEditedSource(
  plugin: EmbedLinkPlugin,
  edited: string,
  original: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): Promise<void> {
  const range = resolveBlockRange(plugin, el, ctx);
  if (!range) {
    notifyMissingBlockRange();
    renderEmbed(plugin, original, el, ctx);
    return;
  }
  try {
    const content = await plugin.app.vault.read(range.file);
    const next = replaceEmbedBlockInMarkdown(
      content,
      range.lineStart,
      range.lineEnd,
      wrapFencedEmbed(edited),
    );
    await plugin.app.vault.modify(range.file, next);
  } catch {
    renderEmbed(plugin, original, el, ctx);
  }
}

async function handleAction(
  action: (typeof CARD_ACTION_ORDER)[number],
  plugin: EmbedLinkPlugin,
  data: WebPageCardData,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): Promise<void> {
  switch (action) {
    case "delete":
      openDeleteConfirmModal(plugin.app, () => deleteEmbed(plugin, el, ctx));
      return;
    case "copy":
      await copyEmbed(plugin, source, el, ctx);
      return;
    case "refresh":
      await refreshEmbed(plugin, data, el, ctx);
      return;
  }
}

async function copyEmbed(
  plugin: EmbedLinkPlugin,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): Promise<void> {
  const range = resolveBlockRange(plugin, el, ctx);
  let block = wrapFencedEmbed(source).replace(/\n+$/, "");
  if (range) {
    try {
      const content = await plugin.app.vault.read(range.file);
      block = extractEmbedBlock(content, range.lineStart, range.lineEnd);
    } catch {
      // fall back to serialized source
    }
  }
  try {
    await navigator.clipboard.writeText(block);
    new Notice(t("notice.copied"));
  } catch (error) {
    new Notice(t("notice.parseFailed", { detail: String(error) }));
  }
}

async function deleteEmbed(
  plugin: EmbedLinkPlugin,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): Promise<void> {
  const range = resolveBlockRange(plugin, el, ctx);
  if (!range) {
    notifyMissingBlockRange();
    return;
  }
  const content = await plugin.app.vault.read(range.file);
  const next = deleteEmbedBlockInMarkdown(content, range.lineStart, range.lineEnd);
  await plugin.app.vault.modify(range.file, next);
  new Notice(t("notice.deleteConfirm"));
}

async function refreshEmbed(
  plugin: EmbedLinkPlugin,
  data: WebPageCardData,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): Promise<void> {
  const range = resolveBlockRange(plugin, el, ctx);
  if (!range) {
    notifyMissingBlockRange();
    return;
  }
  if (!data.url) {
    new Notice(t("notice.parseFailed", { detail: "missing url" }));
    return;
  }
  try {
    const next = await parseUrl(data.url, {
      settings: plugin.settings,
      vault: plugin.app.vault,
      app: plugin.app,
      persistCache: () => plugin.saveSettings(),
    });
    const content = await plugin.app.vault.read(range.file);
    const updated = replaceEmbedBlockInMarkdown(
      content,
      range.lineStart,
      range.lineEnd,
      serializeEmbedBlock(next),
    );
    await plugin.app.vault.modify(range.file, updated);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    new Notice(t("notice.parseFailed", { detail }));
  }
}

function notifyMissingBlockRange(): void {
  new Notice(t("notice.parseFailed", { detail: "missing block range" }));
}

function resolveBlockRange(
  plugin: EmbedLinkPlugin,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): { file: TFile; lineStart: number; lineEnd: number } | null {
  const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
  if (!(file instanceof TFile)) {
    return null;
  }
  const section = ctx.getSectionInfo(el);
  if (!section) {
    return null;
  }
  return { file, lineStart: section.lineStart, lineEnd: section.lineEnd };
}
