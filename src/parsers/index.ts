import type { WebPageCardData } from "../embed/serialize";
import { LocalParser } from "./local";
import { MicroLinkParser } from "./microlink";
import type { ParserName, ParseOptions, UrlParser } from "./types";

export type { ParserName, ParseOptions, UrlParser, MediaHelpers } from "./types";

export async function parseUrlWithFallback(
  url: string,
  primary: UrlParser,
  secondary: UrlParser,
): Promise<WebPageCardData> {
  try {
    return await primary(url);
  } catch {
    return await secondary(url);
  }
}

export async function parseUrlWith(
  parser: ParserName,
  url: string,
  options: ParseOptions,
): Promise<WebPageCardData> {
  switch (parser) {
    case "local":
      return new LocalParser().parse(url, options);
    case "microlink":
      return new MicroLinkParser().parse(url, options);
    default: {
      const _exhaustive: never = parser;
      throw new Error(`Unknown parser: ${String(_exhaustive)}`);
    }
  }
}

export async function parseUrl(
  url: string,
  options: ParseOptions,
): Promise<WebPageCardData> {
  return parseUrlWithFallback(
    url,
    (target) => parseUrlWith("local", target, options),
    (target) => parseUrlWith("microlink", target, options),
  );
}
