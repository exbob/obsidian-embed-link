import type { EmbedLinkSettings } from "../types";

export function getCached(settings: EmbedLinkSettings, key: string): unknown | undefined {
  if (!settings.useCache) {
    return undefined;
  }
  return settings.cache[key];
}

export function setCached(settings: EmbedLinkSettings, key: string, value: unknown): void {
  if (!settings.useCache) {
    return;
  }
  settings.cache[key] = value;
}
