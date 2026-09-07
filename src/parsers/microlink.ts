import { collapseWhitespace, Parser } from "./base";
import type { ParseOptions } from "./types";

const FREE_API = "https://api.microlink.io?url={{{url}}}";
const PRO_API = "https://pro.microlink.io?url={{{url}}}";

interface MicroLinkImage {
  url?: string;
}

interface MicroLinkData {
  title?: string;
  description?: string;
  image?: MicroLinkImage;
  logo?: MicroLinkImage;
}

interface MicroLinkResponse {
  data?: MicroLinkData;
}

export class MicroLinkParser extends Parser {
  protected api = FREE_API;

  protected resolveApi(options: ParseOptions): string {
    return options.settings.microlinkApiKey ? PRO_API : FREE_API;
  }

  protected headers(options: ParseOptions): Record<string, string> {
    const key = options.settings.microlinkApiKey;
    return key ? { "x-api-key": key } : {};
  }

  process(data: unknown): { title: string; image: string; description: string } {
    const payload = data as MicroLinkResponse | null;
    if (!payload?.data) {
      throw new Error("Invalid MicroLink response");
    }
    const title = payload.data.title || "";
    const image = payload.data.image?.url || payload.data.logo?.url || "";
    const description = collapseWhitespace(payload.data.description || "");
    return { title, image, description };
  }
}
