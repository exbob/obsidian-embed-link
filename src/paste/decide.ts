export type UrlAction =
  | { type: "auto-card" }
  | { type: "show-url-menu" }
  | { type: "ignore" };

export function decideUrlPaste(opts: {
  autoEmbed: boolean;
  emptyLine: boolean;
}): UrlAction {
  if (!opts.emptyLine) return { type: "ignore" };
  if (opts.autoEmbed) return { type: "auto-card" };
  return { type: "show-url-menu" };
}
