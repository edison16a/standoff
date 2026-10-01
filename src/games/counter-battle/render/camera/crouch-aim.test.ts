import { describe, expect, it } from "vitest";
import { Battle } from "../../engine/battle";
import { aimEye } from "../../engine/fighter";
import { castRay } from "../../engine/hit";
import { dir3, dist3, type V3 } from "../../engine/vec";
import { crosshair } from "../pane-view";
import { aimTarget, type PanePoint } from "./aim-ray";
import { ShoulderCamera } from "./shoulder-camera";

/** A player behind a low bunker, the camera settled over their shoulder, facing a computer player that stands still. */
function setup() {
  const b = new Battle(
    [
      { team: 0, seat: 1, name: "Me", character: "pro", gun: "rifle" },
      { team: 1, seat: null, name: "Dummy", character: "heavy", gun: "rifle", difficulty: "training" },
    ],
    4,
  );
  while (b.match.phase !== "fight") b.step();
  const me = b.fighters[0]!;
  const low = b.graph.spots.find((s) => !s.tall && s.piece >= 0 && s.pos.z < -5)!;
  me.pos = { ...low.pos };
  // Held at the bunker for the whole test, so only the crouch changes what the camera sees.
  Object.assign(me.brain, { stance: "hide", spot: low.id, route: [], timer: 1e9 });
  const cam = new ShoulderCamera();
  cam.setAspect(16 / 9);
  const settle = () => {
    for (let i = 0; i < 120; i++) {
      b.step();
      cam.update(me, b.pieces, 1 / 60, b.time);
    }
  };
  settle();
  return { b, me, cam, settle };
}

/** What the phone's point lands on, and where the crosshair then sits in the world. */
function aimThrough(s: ReturnType<typeof setup>, p: PanePoint): { target: V3; cross: V3; screen: { x: number; y: number } } {
  const target = aimTarget(s.cam.pose, p, s.b.pieces, s.b.fighters, s.me.id);
  s.b.aimAt(s.me.id, target);
  const cross = castRay(aimEye(s.me), dir3(s.me.aim.yaw, s.me.aim.pitch), s.b.pieces, s.b.fighters, s.me.id).trace.to;
  s.cam.camera.updateMatrixWorld();
  const screen = crosshair(s.me, s.b, s.cam.camera, 1600, 900)!.at;
  return { target, cross, screen };
}

describe("aim through a crouch", { timeout: 60_000 }, () => {
  it("keeps the crosshair on the same point as the player crouches and stands up", () => {
    const s = setup();
    const points: PanePoint[] = [{ x: 0, y: 0 }, { x: 0.3, y: -0.2 }, { x: -0.5, y: 0.1 }];
    const standing = points.map((p) => aimThrough(s, p));
    const eyeUp = s.cam.camera.position.y;

    s.b.setCrouch(s.me.id, true);
    s.settle();
    expect(s.me.crouch).toBe(1);
    // The view holds its height; the body drops in the picture instead.
    expect(s.cam.camera.position.y).toBeCloseTo(eyeUp, 6);
    const crouched = points.map((p) => aimThrough(s, p));

    s.b.setCrouch(s.me.id, false);
    s.settle();
    const back = points.map((p) => aimThrough(s, p));

    for (let i = 0; i < points.length; i++) {
      expect(dist3(crouched[i]!.target, standing[i]!.target)).toBeLessThan(1e-6);
      expect(dist3(crouched[i]!.cross, standing[i]!.cross)).toBeLessThan(1e-6);
      expect(dist3(back[i]!.cross, standing[i]!.cross)).toBeLessThan(1e-6);
      // And the crosshair holds its place on screen, the pixel the player was on.
      expect(Math.hypot(crouched[i]!.screen.x - standing[i]!.screen.x, crouched[i]!.screen.y - standing[i]!.screen.y)).toBeLessThan(0.5);
    }
  });
});
