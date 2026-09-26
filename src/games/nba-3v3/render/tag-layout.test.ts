import { describe, expect, it } from "vitest";
import { stackTags, type TagBox } from "./tag-layout";

const tag = (x: number, y: number, w = 70, h = 22): TagBox => ({ x, y, w, h });

describe("stackTags", () => {
  it("leaves tags that are apart where they are", () => {
    expect(stackTags([tag(100, 300), tag(300, 300), tag(100, 200)])).toEqual([0, 0, 0]);
  });

  it("lifts the higher of two overlapping tags just above the lower", () => {
    const [near, far] = stackTags([tag(400, 310), tag(420, 300)]);
    expect(near).toBe(0);
    expect(300 + far!).toBeCloseTo(310 - 22 - 3);
  });

  it("stacks a crowd into a column with nothing overlapping", () => {
    // Fractions, as projected points are, so rounding cannot leave two tags on one spot.
    const boxes = [tag(400.3, 300.1), tag(405.7, 302.3), tag(410.1, 298.9), tag(398.2, 300.1)];
    const lift = stackTags(boxes);
    const bottoms = boxes.map((b, i) => b.y + lift[i]!).sort((a, b) => a - b);
    for (let i = 1; i < bottoms.length; i++) expect(bottoms[i]! - bottoms[i - 1]!).toBeGreaterThanOrEqual(25 - 1e-9);
    expect(Math.max(...lift)).toBe(0);
  });

  it("makes room for a shooter's meter above their name", () => {
    const [shooter, other] = stackTags([tag(400, 300, 70, 94), tag(400, 290)]);
    expect(shooter).toBe(0);
    expect(290 + other!).toBeLessThanOrEqual(300 - 94 - 3);
  });
});
