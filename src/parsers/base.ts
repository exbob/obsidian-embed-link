import { requestUrl as defaultRequestUrl } from "obsidian";
import type { WebPageCardData } from "../embed/serialize";
import type { ParseOptions } from "./types";

export async function applyMediaSideEffects(
  data: WebPageCardData,
  _options: ParseOptions,
): Promise<WebPageCardData> {
  return data;
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
