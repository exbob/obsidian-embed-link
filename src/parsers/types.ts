import type { requestUrl, Vault } from "obsidian";
import type { EmbedLinkSettings } from "../types";
import type { WebPageCardData } from "../embed/serialize";

export type ParserName = "local" | "microlink";

export interface ParseOptions {
  settings: EmbedLinkSettings;
  vault: Vault;
  requestUrl?: typeof requestUrl;
}

export type UrlParser = (url: string) => Promise<WebPageCardData>;

/** Task 6 wires download + aspect ratio; parsers no-op when helpers are absent. */
export interface MediaHelpers {
  downloadImageToVault?(
    imageUrl: string,
    vault: Vault,
    folderPath: string,
  ): Promise<string>;
  getImageAspectRatio?(imageUrl: string): Promise<number | undefined>;
}
