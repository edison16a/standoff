import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Cube } from "../../engine/pickups";
import { boxTint } from "./box-look";

function cube(count: 1 | 2): Cube {
  return { s: 0, d: 0, x: 0, y: 0, z: 0, count, respawnAt: 0 };
}

/** Hue in degrees, 0 to 360. */
function hue(color: string): number {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(color).getHSL(hsl);
  return hsl.h * 360;
}

describe("item box colours", () => {
  it("makes every double box gold", () => {
    for (let i = 0; i < 12; i++) expect(boxTint(cube(2), i)).toBe(boxTint(cube(2), 0));
  });

  it("never paints a single box yellow or orange, so a double stands out down the road", () => {
    const gold = hue(boxTint(cube(2), 0));
    for (let i = 0; i < 12; i++) {
      const gap = Math.abs(hue(boxTint(cube(1), i)) - gold);
      expect(Math.min(gap, 360 - gap)).toBeGreaterThan(45);
    }
  });
});
