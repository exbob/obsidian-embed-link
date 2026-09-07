export interface EmbedLinkSettings {
  autoEmbed: boolean;
  downloadImages: boolean;
  imageFolderPath: string;
  keepAspectRatio: boolean;
  useCache: boolean;
  showFavicon: boolean;
  microlinkApiKey: string;
  cache: Record<string, unknown>;
}
