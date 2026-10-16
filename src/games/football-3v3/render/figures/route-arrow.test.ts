import { describe, expect, it } from "vitest";
import { ARROW, arrowGeometry, arrowOutline } from "./route-arrow";

/** The area a geometry covers, from its triangles on the ground. */
function area(points: { x: number; z: number }[]): number {
  const g = arrowGeometry(points)!;
  const pos = g.getAttribute("position");
  const index = g.getIndex()!;
  let sum = 0;
  for (let i = 0; i < index.count; i += 3) {
    const [a, b, c] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const ux = pos.getX(b) - pos.getX(a);
    const uz = pos.getZ(b) - pos.getZ(a);
    const vx = pos.getX(c) - pos.getX(a);
    const vz = pos.getZ(c) - pos.getZ(a);
    sum += Math.abs(ux * vz - uz * vx) / 2;
  }
  return sum;
}

describe("the route arrow on the turf", () => {
  it("keeps one width along a straight route and ends in a crisp head", () => {
    const length = 10;
    const body = (length - ARROW.head) * ARROW.width;
    const head = (ARROW.head * ARROW.headWidth) / 2;
    expect(area([{ x: 0, z: 0 }, { x: length, z: 0 }])).toBeCloseTo(body + head, 4);
  });

  it("turns a sharp corner without overlapping itself, so a see through arrow stays even", () => {
    // Up eight, then straight out: the ribbon fills each leg once and the corner once.
    const route = [{ x: 0, z: 0 }, { x: 8, z: 0 }, { x: 8, z: 6 }];
    const legs = 8 * ARROW.width + (6 - ARROW.head) * ARROW.width;
    const head = (ARROW.head * ARROW.headWidth) / 2;
    expect(area(route)).toBeCloseTo(legs + head, 4);
    // Mitred: one point on each side of the corner, so the corner is sharp.
    expect(arrowOutline(route)).toHaveLength(2 + 2 + 3 + 2);
  });

  it("has nothing to draw for a route with no length", () => {
    expect(arrowOutline([{ x: 1, z: 1 }, { x: 1, z: 1 }])).toBeNull();
  });
});
