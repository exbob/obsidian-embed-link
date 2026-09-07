import { Modal, type App } from "obsidian";
import { t } from "../i18n";

export const CARD_ACTION_ORDER = ["refresh", "copy", "delete"] as const;

export type CardAction = (typeof CARD_ACTION_ORDER)[number];

export function wrapFencedEmbed(source: string): string {
  const trimmed = source.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.endsWith("```") ? `${trimmed}\n` : `${trimmed}\n\`\`\`\n`;
  }
  return `\`\`\`embed\n${trimmed}\n\`\`\`\n`;
}

export function extractEmbedBlock(
  markdown: string,
  lineStart: number,
  lineEnd: number,
): string {
  return markdown.split("\n").slice(lineStart, lineEnd + 1).join("\n");
}

export function replaceEmbedBlockInMarkdown(
  markdown: string,
  lineStart: number,
  lineEnd: number,
  newBlock: string,
): string {
  const lines = markdown.split("\n");
  const indent = lines[lineStart]?.match(/^(\s*)/)?.[1] ?? "";
  const replacement = newBlock.replace(/\n+$/, "").split("\n").map((line) => indent + line);
  return [...lines.slice(0, lineStart), ...replacement, ...lines.slice(lineEnd + 1)].join("\n");
}

export function deleteEmbedBlockInMarkdown(
  markdown: string,
  lineStart: number,
  lineEnd: number,
): string {
  const lines = markdown.split("\n");
  return [...lines.slice(0, lineStart), ...lines.slice(lineEnd + 1)].join("\n");
}

export class DeleteConfirmModal extends Modal {
  private readonly onConfirm: () => void | Promise<void>;

  constructor(app: App, onConfirm: () => void | Promise<void>) {
    super(app);
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    this.setTitle(t("modal.deleteTitle"));
    const message = document.createElement("p");
    message.textContent = t("modal.deleteConfirm");
    this.contentEl.appendChild(message);

    const row = document.createElement("div");
    row.className = "embed-link-modal-buttons";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("modal.cancel");
    cancel.addEventListener("click", () => this.close());

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "mod-warning";
    confirm.textContent = t("card.delete");
    confirm.addEventListener("click", () => {
      void Promise.resolve(this.onConfirm()).finally(() => this.close());
    });

    row.append(cancel, confirm);
    this.contentEl.appendChild(row);
  }
}

export function openDeleteConfirmModal(app: App, onConfirm: () => void | Promise<void>): void {
  new DeleteConfirmModal(app, onConfirm).open();
}
