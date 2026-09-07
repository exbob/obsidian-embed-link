import { describe, it, expect } from "vitest";
import { serializeEmbedBlock, parseEmbedBlock } from "../src/embed/serialize";

describe("embed serialize/parse", () => {
  it("round-trips fields", () => {
    const data = {
      title: 'Say "Hi"',
      image: "https://img/a.png",
      description: "Hello",
      url: "https://example.com",
      favicon: "https://example.com/f.ico",
      aspectRatio: 1.5,
    };
    const block = serializeEmbedBlock(data);
    expect(block.startsWith("```embed\n")).toBe(true);
    expect(parseEmbedBlock(block.replace(/^```embed\n/, "").replace(/\n```$/, ""))).toEqual(
      data,
    );
  });
});
