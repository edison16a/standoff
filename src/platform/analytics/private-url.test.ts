import { describe, expect, it } from "vitest";
import { privateUrl } from "./private-url";

describe("privateUrl", () => {
  it("hides the room code and the player's name on a controller page", () => {
    expect(privateUrl("https://standoffgames.vercel.app/play/ABCD/Edison%20Law")).toBe("https://standoffgames.vercel.app/play/[code]/[name]");
  });

  it("hides the room code on the join page", () => {
    expect(privateUrl("https://standoffgames.vercel.app/join/WXYZ")).toBe("https://standoffgames.vercel.app/join/[code]");
  });

  it("keeps other pages as they are, without query or fragment", () => {
    expect(privateUrl("https://standoffgames.vercel.app/?game=blade-clash#top")).toBe("https://standoffgames.vercel.app/");
    expect(privateUrl("https://standoffgames.vercel.app/join")).toBe("https://standoffgames.vercel.app/join");
  });

  it("leaves something that is not a URL alone", () => {
    expect(privateUrl("not a url")).toBe("not a url");
  });
});
