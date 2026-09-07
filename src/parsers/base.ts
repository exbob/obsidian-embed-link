import { requestUrl as defaultRequestUrl } from "obsidian";
import { getCached, setCached } from "../cache/store";
import type { WebPageCardData } from "../embed/serialize";
import { getAspectRatio } from "../media/aspect-ratio";
import { downloadImageToVault, resolveImageFolderPath } from "../media/download";
import type { ParseOptions } from "./types";

export async function applyMediaSideEffects(
  data: WebPageCardData,
  options: ParseOptions,
): Promise<WebPageCardData> {
  const result: WebPageCardData = { ...data };
  const requestUrlFn = options.requestUrl ?? defaultRequestUrl;
  const download =
    options.mediaHelpers?.downloadImageToVault ??
    ((imageUrl, vault, folderPath) =>
      downloadImageToVault(imageUrl, vault, folderPath, requestUrlFn));
  const measure =
    options.mediaHelpers?.getImageAspectRatio ??
    ((imageUrl: string) =>
      getAspectRatio(imageUrl, options.settings.useCache ? options.settings.cache : {}, {
        requestUrl: requestUrlFn,
        vault: options.vault,
      }));

  if (options.settings.downloadImages && result.image) {
    const remoteUrl = result.image;
    try {
      const cachedPath = getCached(options.settings, remoteUrl);
      if (typeof cachedPath === "string" && options.vault.getAbstractFileByPath(cachedPath)) {
        result.image = cachedPath;
      } else {
        const folder = resolveImageFolderPath(options.settings, options.app);
        const dest = await download(remoteUrl, options.vault, folder);
        result.image = dest;
        if (dest !== remoteUrl) {
          setCached(options.settings, remoteUrl, dest);
          if (options.settings.useCache) {
            await options.persistCache?.();
          }
        }
      }
    } catch {
      // keep original URL
    }
  }

  if (options.settings.keepAspectRatio && result.image) {
    const cacheKey = result.image;
    const cached = getCached(options.settings, cacheKey);
    if (typeof cached === "number") {
      result.aspectRatio = cached;
    } else {
      try {
        const ratio = await measure(result.image);
        if (ratio !== undefined) {
          result.aspectRatio = ratio;
          setCached(options.settings, cacheKey, ratio);
          if (options.settings.useCache) {
            await options.persistCache?.();
          }
        }
      } catch {
        // omit aspectRatio
      }
    }
  }

  return result;
}

export abstract class Parser {
  protected api = "";

  protected requestFn(options: ParseOptions): NonNullable<ParseOptions["requestUrl"]> {
    return options.requestUrl ?? defaultRequestUrl;
  }

  protected resolveApi(_options: ParseOptions): string {
    return this.api;
  }

  protected headers(_options: ParseOptions): Record<string, string> {
    return {};
  }

  protected buildApiUrl(url: string, options: ParseOptions): string {
    return this.resolveApi(options).replace("{{{url}}}", encodeURIComponent(url));
  }

  async fetchJson(url: string, options: ParseOptions): Promise<unknown> {
    const fetch = this.requestFn(options);
    const response = await fetch({
      url: this.buildApiUrl(url, options),
      method: "GET",
      headers: this.headers(options),
    });
    return response.json;
  }

  async parse(url: string, options: ParseOptions): Promise<WebPageCardData> {
    const raw = await this.fetchJson(url, options);
    const processed = this.process(raw);
    return applyMediaSideEffects({ ...processed, url }, options);
  }

  abstract process(data: unknown): {
    title: string;
    image: string;
    description: string;
    favicon?: string;
  };
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\n/g, " ");
}
