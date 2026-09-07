import type { App, requestUrl, Vault } from "obsidian";
import type { EmbedLinkSettings } from "../types";
import type { WebPageCardData } from "../embed/serialize";

export type ParserName = "local" | "microlink";

export interface ParseOptions {
  settings: EmbedLinkSettings;
  vault: Vault;
  app?: App;
  /** Note path used to relativize downloaded image paths (Obsidian link style). */
  sourcePath?: string;
  requestUrl?: typeof requestUrl;
  persistCache?: () => void | Promise<void>;
  mediaHelpers?: MediaHelpers;
}

export type UrlParser = (url: string) => Promise<WebPageCardData>;

export interface MediaHelpers {
  downloadImageToVault?(
    imageUrl: string,
    vault: Vault,
    folderPath: string,
  ): Promise<string>;
  getImageAspectRatio?(imageUrl: string): Promise<number | undefined>;
}
