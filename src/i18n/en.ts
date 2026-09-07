import type { MessageKey } from "./types";

export const en: Record<MessageKey, string> = {
  "urlMenu.webPageCard": "Web page card",
  "urlMenu.videoPreview": "Video preview",
  "urlMenu.markdownLink": "Markdown link",
  "urlMenu.plainText": "Plain text",
  "fileMenu.filenameLink": "Filename link",
  "fileMenu.defaultLink": "Default link",
  "setting.autoEmbed": "Auto embed on paste",
  "setting.autoEmbedDesc":
    "When enabled, paste a URL or file on an empty line to insert an embed or wiki link automatically.",
  "setting.downloadImages": "Download images to vault",
  "setting.downloadImagesDesc":
    "Save preview images from parsed URLs into the vault instead of hotlinking.",
  "setting.imageFolderPath": "Image folder path",
  "setting.imageFolderPathDesc":
    "Folder for downloaded embed images. Leave empty to use Obsidian's default attachment path.",
  "setting.keepAspectRatio": "Keep image aspect ratio",
  "setting.keepAspectRatioDesc":
    "Preserve the original aspect ratio of preview images on web page cards.",
  "setting.useCache": "Use parser cache",
  "setting.useCacheDesc":
    "Cache parsed URL metadata to speed up repeat embeds and refreshes.",
  "setting.showFavicon": "Show favicon",
  "setting.showFaviconDesc": "Display the site favicon on web page cards when available.",
  "setting.microlinkApiKey": "MicroLink API key",
  "setting.microlinkApiKeyDesc":
    "Optional API key for the MicroLink parser. Leave empty for the free tier.",
  "command.createWebPageCard": "Create web page card",
  "command.createWebPageCardLocal": "Create web page card (local parser)",
  "command.createWebPageCardMicrolink": "Create web page card (MicroLink parser)",
  "card.edit": "Edit",
  "card.delete": "Delete",
  "card.copy": "Copy",
  "card.refresh": "Refresh",
  "notice.parseFailed": "Could not parse this URL: {detail}",
  "notice.deleteConfirm": "Embed block deleted",
  "notice.copied": "Copied to clipboard",
  "modal.deleteTitle": "Delete embed",
  "modal.deleteConfirm":
    "Delete this embed block? If it uses a local preview image, that file will be deleted too.",
  "modal.cancel": "Cancel",
};
