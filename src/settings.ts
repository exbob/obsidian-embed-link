import type { EmbedLinkSettings } from "./types";

export type { EmbedLinkSettings } from "./types";

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

export function normalizeSettings(raw: unknown): EmbedLinkSettings {
  const record =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const cache =
    typeof record.cache === "object" &&
    record.cache !== null &&
    !Array.isArray(record.cache)
      ? (record.cache as Record<string, unknown>)
      : DEFAULT_SETTINGS.cache;

  return {
    autoEmbed:
      typeof record.autoEmbed === "boolean"
        ? record.autoEmbed
        : DEFAULT_SETTINGS.autoEmbed,
    downloadImages:
      typeof record.downloadImages === "boolean"
        ? record.downloadImages
        : DEFAULT_SETTINGS.downloadImages,
    imageFolderPath:
      typeof record.imageFolderPath === "string"
        ? record.imageFolderPath
        : DEFAULT_SETTINGS.imageFolderPath,
    keepAspectRatio:
      typeof record.keepAspectRatio === "boolean"
        ? record.keepAspectRatio
        : DEFAULT_SETTINGS.keepAspectRatio,
    useCache:
      typeof record.useCache === "boolean"
        ? record.useCache
        : DEFAULT_SETTINGS.useCache,
    showFavicon:
      typeof record.showFavicon === "boolean"
        ? record.showFavicon
        : DEFAULT_SETTINGS.showFavicon,
    microlinkApiKey:
      typeof record.microlinkApiKey === "string"
        ? record.microlinkApiKey
        : DEFAULT_SETTINGS.microlinkApiKey,
    cache,
  };
}
