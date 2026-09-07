import type { WebPageCardData } from "../embed/serialize";
import { applyMediaSideEffects, collapseWhitespace, Parser } from "./base";
import type { ParseOptions } from "./types";

function metaContent(doc: Document, selector: string): string {
  const element = doc.querySelector(selector);
  if (element instanceof HTMLMetaElement) {
    return element.content;
  }
  return "";
}

function resolveUrl(value: string, base: URL): string {
  try {
    return new URL(value, base.href).href;
  } catch {
    return "";
  }
}

export class LocalParser extends Parser {
  process(data: unknown): {
    title: string;
    image: string;
    description: string;
    favicon?: string;
  } {
    const record = (data ?? {}) as {
      title?: string;
      image?: string;
      description?: string;
      favicon?: string;
    };
    return {
      title: collapseWhitespace(record.title || ""),
      image: record.image || "",
      description: collapseWhitespace(record.description || ""),
      favicon: record.favicon || undefined,
    };
  }

  getTitle(doc: Document, url: URL): string {
    const ogTitle = metaContent(doc, 'head meta[property="og:title"]');
    if (ogTitle) {
      return ogTitle;
    }
    const title = doc.querySelector("head title");
    if (title?.textContent) {
      return title.textContent;
    }
    return url.hostname;
  }

  getImage(doc: Document, url: URL): string {
    const ogImage = metaContent(doc, 'head meta[property="og:image"]');
    if (!ogImage) {
      return "";
    }
    return resolveUrl(ogImage, url);
  }

  getDescription(doc: Document): string {
    const og = metaContent(doc, 'head meta[property="og:description"]');
    if (og) {
      return og;
    }
    return metaContent(doc, 'head meta[name="description"]');
  }

  getFavicon(doc: Document, url: URL): string {
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];
    for (const selector of selectors) {
      const href = doc.querySelector(selector)?.getAttribute("href");
      if (href) {
        const resolved = resolveUrl(href, url);
        if (resolved) {
          return resolved;
        }
      }
    }
    return resolveUrl("/favicon.ico", url);
  }

  async parse(url: string, options: ParseOptions): Promise<WebPageCardData> {
    const html = await this.fetchHtml(url, options);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pageUrl = new URL(url);
    const processed = this.process({
      title: this.getTitle(doc, pageUrl),
      image: this.getImage(doc, pageUrl),
      description: this.getDescription(doc),
      favicon: this.getFavicon(doc, pageUrl),
    });
    return applyMediaSideEffects({ ...processed, url }, options);
  }

  private async fetchHtml(url: string, options: ParseOptions): Promise<string> {
    const fetch = this.requestFn(options);
    const response = await fetch({ url });
    const html = response.text;
    if (!html) {
      throw new Error(`Failed to fetch HTML content from ${url}`);
    }
    return html;
  }
}
