import { describe, expect, it } from "vitest";
import { stackTags, type TagBox } from "./tag-layout";

// Half screen heights: a tag is about a thirteenth of that high.
const tag = (x: number, y: number, w = 0.25, h = 0.075): TagBox => ({ x, y, w, h });

describe("stackTags", () => {
  it("leaves tags that are apart where they are", () => {
    expect(stackTags([tag(-0.5, 0.2), tag(0.5, 0.2), tag(-0.5, -0.4)])).toEqual([0, 0, 0]);
  });

  it("lifts the higher of two overlapping tags just above the lower", () => {
    const [near, far] = stackTags([tag(0, 0.2), tag(0.05, 0.18)]);
    expect(near).toBe(0);
    expect(0.18 + far!).toBeCloseTo(0.2 - 0.075 - 0.008);
  });

  it("stacks a crowd into a column with nothing overlapping", () => {
    const boxes = [tag(0, 0.2), tag(0.02, 0.21), tag(-0.03, 0.19), tag(0.01, 0.2)];
    const lift = stackTags(boxes);
    const bottoms = boxes.map((b, i) => b.y + lift[i]!).sort((a, b) => a - b);
    for (let i = 1; i < bottoms.length; i++) expect(bottoms[i]! - bottoms[i - 1]!).toBeGreaterThanOrEqual(0.083 - 1e-9);
    expect(Math.max(...lift)).toBe(0);
  });
});
