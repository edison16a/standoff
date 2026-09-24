import { describe, expect, it } from "vitest";
import { splitScreen } from "./layout";

describe("splitScreen", () => {
  it("gives one full view, two halves, or quadrants", () => {
    expect(splitScreen(1)).toEqual([{ x: 0, y: 0, w: 1, h: 1 }]);
    expect(splitScreen(2).map((r) => r.w)).toEqual([0.5, 0.5]);
    expect(splitScreen(3)).toHaveLength(3);
    expect(splitScreen(4).every((r) => r.w === 0.5 && r.h === 0.5)).toBe(true);
  });

  it("never overlaps two views", () => {
    for (const count of [1, 2, 3, 4]) {
      const area = splitScreen(count).reduce((sum, r) => sum + r.w * r.h, 0);
      expect(area).toBeLessThanOrEqual(1);
    }
  });

  it("leaves the top right quadrant free for the map with three players", () => {
    const rects = splitScreen(3);
    expect(rects.some((r) => r.x >= 0.5 && r.y < 0.5)).toBe(false);
  });
});
