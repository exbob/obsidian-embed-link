import { describe, it, expect } from "vitest";
import { decideUrlPaste } from "../src/paste/decide";

describe("decideUrlPaste", () => {
  it("ignores URL paste on a non-empty line", () => {
    expect(decideUrlPaste({ autoEmbed: false, emptyLine: false })).toEqual({
      type: "ignore",
    });
    expect(decideUrlPaste({ autoEmbed: true, emptyLine: false })).toEqual({
      type: "ignore",
    });
  });

  it("auto-embeds a web page card on an empty line when autoEmbed is on", () => {
    expect(decideUrlPaste({ autoEmbed: true, emptyLine: true })).toEqual({
      type: "auto-card",
    });
  });

  it("shows the URL menu on an empty line when autoEmbed is off", () => {
    expect(decideUrlPaste({ autoEmbed: false, emptyLine: true })).toEqual({
      type: "show-url-menu",
    });
  });
});
