import { describe, expect, it } from "vitest";
import { PIECES } from "../../engine/arena";
import { rayPieces } from "../../engine/geometry";
import { fighterAt } from "../../engine/test-helpers";
import { aimTarget, paneRay, toPane, type CameraPose } from "./aim-ray";

const CAM: CameraPose = { x: 0, y: 1.8, z: -25, yaw: 0, pitch: 0, fov: 60, aspect: 16 / 9 };

describe("aiming through a pane", () => {
  it("looks straight ahead through the middle, and to the right through the right edge", () => {
    const mid = paneRay(CAM, { x: 0, y: 0 });
    expect(mid.z).toBeCloseTo(1);
    const right = paneRay(CAM, { x: 1, y: 0 });
    // Facing +z, the right hand side is -x, at half the horizontal field of view.
    expect(right.x).toBeLessThan(0);
    const half = Math.atan(Math.tan(Math.PI / 6) * CAM.aspect);
    expect(Math.atan2(-right.x, right.z)).toBeCloseTo(half);
    expect(paneRay(CAM, { x: 0, y: 1 }).y).toBeCloseTo(Math.sin(Math.PI / 6));
  });

  it("maps a pane point to the world and back to the same point", () => {
    const cam: CameraPose = { ...CAM, yaw: 0.7, pitch: -0.1, aspect: 0.9 };
    for (const p of [{ x: 0.3, y: -0.4 }, { x: -0.9, y: 0.8 }, { x: 0, y: 0 }]) {
      const d = paneRay(cam, p);
      const w = { x: cam.x + d.x * 12, y: cam.y + d.y * 12, z: cam.z + d.z * 12 };
      const back = toPane(cam, w)!;
      expect(back.x).toBeCloseTo(p.x);
      expect(back.y).toBeCloseTo(p.y);
    }
    expect(toPane(CAM, { x: 0, y: 1.8, z: -30 })).toBeNull();
  });

  it("aims at the first thing on the ray: a fighter in front of a bunker", () => {
    const ahead = rayPieces({ x: 0, y: 1.2, z: -25 }, { x: 0, y: 0, z: 1 }, PIECES, 100)!;
    const cam: CameraPose = { ...CAM, y: 1.2 };
    const bunker = aimTarget(cam, { x: 0, y: 0 }, PIECES, [], 0);
    expect(bunker.z).toBeCloseTo(-25 + ahead.t, 3);
    const enemy = fighterAt(1, 1, 0, -25 + ahead.t - 0.8);
    // The shooter stands just ahead of the camera: the ray passes through them without stopping.
    const self = fighterAt(0, 0, 0, -24.4);
    const onEnemy = aimTarget(cam, { x: 0, y: 0 }, PIECES, [self, enemy], 0);
    expect(onEnemy.z).toBeCloseTo(enemy.pos.z - 0.3, 3);
  });
});
