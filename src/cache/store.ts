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

/** Drop cache entries that key or string-value match any of the given image paths. */
export function clearCacheForImagePaths(
  settings: EmbedLinkSettings,
  paths: Iterable<string>,
): boolean {
  const wanted = new Set([...paths].filter(Boolean));
  if (wanted.size === 0) {
    return false;
  }
  let changed = false;
  for (const [key, value] of Object.entries(settings.cache)) {
    if (wanted.has(key) || (typeof value === "string" && wanted.has(value))) {
      delete settings.cache[key];
      changed = true;
    }
  }
  return changed;
}
