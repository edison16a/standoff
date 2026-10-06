import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILD_IDS, BUILDS } from "../../builds";
import { TEAMS } from "../../teams";
import { bodyGeometry, sharedBodyGeometry } from "./body-geometry";
import { BONES } from "./rig";

const LOOKS = [
  ...BUILD_IDS.map((id) => ({ name: id, look: BUILDS[id].look, keeper: false })),
  { name: "red keeper", look: TEAMS[0].keeperLook, keeper: true },
  { name: "blue keeper", look: TEAMS[1].keeperLook, keeper: true },
];

const triangles = (g: THREE.BufferGeometry) => g.index!.count / 3;

describe("bodyGeometry", () => {
  for (const fine of [true, false]) {
    for (const { name, look, keeper } of LOOKS) {
      it(`builds the ${name} ${fine ? "finely" : "coarsely"}, skinned and within budget`, () => {
        const g = bodyGeometry(look, keeper, fine);
        const parts = [g.skin, g.kit, g.gear];
        // Three draws a player: the budget keeps nine players and their shadows cheap on a laptop.
        const total = parts.reduce((sum, p) => sum + triangles(p), 0);
        expect(total).toBeLessThan(fine ? 48000 : 12000);
        for (const p of parts) {
          const index = p.getAttribute("skinIndex");
          const weight = p.getAttribute("skinWeight");
          for (let i = 0; i < index.count; i++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
              expect(index.getComponent(i, k)).toBeLessThan(BONES.length);
              sum += weight.getComponent(i, k);
            }
            expect(Math.abs(sum - 1)).toBeLessThan(1e-4);
          }
        }
        // Standing at rest the body is as tall as the look, give or take the hair, and as wide one side as the other.
        const box = new THREE.Box3();
        for (const p of parts) {
          p.computeBoundingBox();
          box.union(p.boundingBox!);
        }
        expect(box.max.y).toBeGreaterThan(look.height - 0.06);
        expect(box.max.y).toBeLessThan(look.height + 0.08);
        expect(box.min.y).toBeGreaterThan(-0.05);
        expect(Math.abs(box.max.x + box.min.x)).toBeLessThan(0.01);
      });
    }
  }

  it("prints the whole kit from inside the texture", () => {
    const g = bodyGeometry(BUILDS.striker.look, false, false);
    const uv = g.kit.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThanOrEqual(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(i)).toBeLessThanOrEqual(1);
    }
  });

  it("builds a look once and shares it", () => {
    const look = BUILDS.winger.look;
    expect(sharedBodyGeometry(look, false, false)).toBe(sharedBodyGeometry(look, false, false));
    expect(sharedBodyGeometry(look, false, false)).not.toBe(sharedBodyGeometry(look, false, true));
  });
});
