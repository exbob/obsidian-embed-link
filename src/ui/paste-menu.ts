import { Menu, type Editor } from "obsidian";
import type EmbedLinkPlugin from "../main";
import { t } from "../i18n";
import { FILE_MENU_ITEMS, type FileMenuId, applyFileMenuChoice } from "./file-suggest";
import { URL_MENU_ITEMS, type UrlMenuId, applyUrlMenuChoice } from "./url-suggest";

/** Show URL paste choices with Obsidian Menu (reliable after preventDefault). */
export function showUrlPasteMenu(
  plugin: EmbedLinkPlugin,
  editor: Editor,
  url: string,
): void {
  const menu = new Menu();
  for (const item of URL_MENU_ITEMS) {
    menu.addItem((menuItem) => {
      menuItem.setTitle(t(item.key)).onClick(() => {
        void applyUrlMenuChoice(plugin, editor, url, item.id as UrlMenuId);
      });
    });
  }
  menu.showAtPosition(menuPositionNearCursor(editor));
}

/** Show file paste choices with Obsidian Menu (reliable after preventDefault). */
export function showFilePasteMenu(
  plugin: EmbedLinkPlugin,
  editor: Editor,
  file: File,
): void {
  const menu = new Menu();
  for (const item of FILE_MENU_ITEMS) {
    menu.addItem((menuItem) => {
      menuItem.setTitle(t(item.key)).onClick(() => {
        void applyFileMenuChoice(plugin, editor, file, item.id as FileMenuId);
      });
    });
  }
  menu.showAtPosition(menuPositionNearCursor(editor));
}

function menuPositionNearCursor(editor: Editor): { x: number; y: number } {
  try {
    const maybe = editor as Editor & {
      coordsAtPos?: (pos: { line: number; ch: number }) => { left: number; bottom: number } | null;
    };
    if (typeof maybe.coordsAtPos === "function") {
      const coords = maybe.coordsAtPos(editor.getCursor());
      if (coords) {
        return { x: coords.left, y: coords.bottom + 4 };
      }
    }
  } catch {
    // fall through
  }
  return {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 3),
  };
}
