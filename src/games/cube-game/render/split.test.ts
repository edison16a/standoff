import { describe, expect, it } from "vitest";
import { splitRects } from "./split";

describe("splitRects", () => {
  it("gives one view the whole screen", () => {
    expect(splitRects(1)).toEqual([{ x: 0, y: 0, w: 1, h: 1 }]);
  });

  it("stacks two views, player one on top, tiling the screen exactly", () => {
    const [top, bottom] = splitRects(2);
    expect(top).toEqual({ x: 0, y: 0, w: 1, h: 0.5 });
    expect(bottom).toEqual({ x: 0, y: 0.5, w: 1, h: 0.5 });
  });

  it("never returns no view", () => {
    expect(splitRects(0)).toHaveLength(1);
  });
});
