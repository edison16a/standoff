import { describe, expect, it } from "vitest";
import { Battle } from "../../engine/battle";
import { aimEye } from "../../engine/fighter";
import { castRay } from "../../engine/hit";
import { dir3, dist3 } from "../../engine/vec";
import { crosshair } from "../pane-view";
import { aimTarget, type PanePoint } from "./aim-ray";
import { ShoulderCamera } from "./shoulder-camera";

const W = 1600;
const H = 900;

/** A player whose fighter moves by itself, against a computer player that stands still. */
function setup() {
  const b = new Battle(
    [
      { team: 0, seat: 1, name: "Me", character: "pro", gun: "smg" },
      { team: 1, seat: null, name: "Dummy", character: "heavy", gun: "rifle", difficulty: "training" },
    ],
    6,
  );
  while (b.match.phase !== "fight") b.step();
  const cam = new ShoulderCamera();
  cam.setAspect(W / H);
  return { b, me: b.fighters[0]!, cam };
}

describe("aim on the move", { timeout: 60_000 }, () => {
  // The host aims through the camera, the battle steps and the camera follows the fighter, then
  // the host aims again before the crosshair is drawn, as the canvas does each frame.
  it("keeps the crosshair on the phone's point while the fighter moves round the fight", () => {
    const { b, me, cam } = setup();
    const point: PanePoint = { x: 0.2, y: -0.1 };
    const want = { x: ((point.x + 1) / 2) * W, y: ((point.y + 1) / 2) * H };
    const aim = () => b.aimAt(me.id, aimTarget(cam.pose, point, b.pieces, b.fighters, me.id));
    cam.update(me, b.pieces, 1 / 60, b.time);
    let travelled = 0;
    const off: number[] = [];
    for (let frame = 0; frame < 60 * 20; frame++) {
      aim();
      const before = { ...me.pos };
      b.step();
      travelled += Math.hypot(me.pos.x - before.x, me.pos.z - before.z);
      cam.update(me, b.pieces, 1 / 60, b.time);
      aim();
      // Only where the gun sees the same point the camera does: a bunker in front of the barrel alone stops the paint early, truly.
      const target = aimTarget(cam.pose, point, b.pieces, b.fighters, me.id);
      const shot = castRay(aimEye(me), dir3(me.aim.yaw, me.aim.pitch), b.pieces, b.fighters, me.id).trace.to;
      if (dist3(shot, target) > 0.05) continue;
      cam.camera.updateMatrixWorld();
      const at = crosshair(me, b, cam.camera, W, H)!.at;
      off.push(Math.hypot(at.x - want.x, at.y - want.y));
    }
    off.sort((a, c) => a - c);
    // Dead on nearly always; the odd frame where the barrel just clears a bunker edge is a pixel or so out.
    expect(off[Math.floor(off.length * 0.95)]!).toBeLessThan(0.01);
    expect(off.at(-1)!).toBeLessThan(2);
    expect(travelled).toBeGreaterThan(20);
    expect(off.length).toBeGreaterThan(60 * 10);
  });
});
