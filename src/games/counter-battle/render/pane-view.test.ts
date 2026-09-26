import { describe, expect, it } from "vitest";
import { Battle } from "../engine/battle";
import { ShoulderCamera } from "./camera/shoulder-camera";
import { crosshair } from "./pane-view";

function battle(): Battle {
  return new Battle(
    [
      { team: 0, seat: 1, name: "A", character: "pro", gun: "rifle" },
      { team: 1, seat: 2, name: "B", character: "heavy", gun: "sniper" },
    ],
    3,
  );
}

describe("the crosshair in a player's view", () => {
  it("sits where the player points, and moves up with the kick", () => {
    const b = battle();
    const f = b.fighters[0]!;
    const cam = new ShoulderCamera();
    cam.setAspect(16 / 9);
    cam.update(f, b.pieces, 1 / 60, b.time);
    cam.camera.updateMatrixWorld();
    // Aim straight along the camera's middle, well down the field.
    f.aim = { yaw: f.look, pitch: -0.02 };
    const plain = crosshair(f, b, cam.camera, 960, 540);
    expect(plain).not.toBeNull();
    expect(plain!.at.x).toBeGreaterThan(0);
    expect(plain!.at.x).toBeLessThan(960);
    expect(plain!.at.y).toBeGreaterThan(0);
    expect(plain!.at.y).toBeLessThan(540);
    f.gun.kick.pitch = 0.1;
    const kicked = crosshair(f, b, cam.camera, 960, 540)!;
    expect(kicked.at.y).toBeGreaterThan(plain!.at.y + 20);
  });

  it("opens wider with the spread of a running fighter", () => {
    const b = battle();
    const f = b.fighters[0]!;
    const cam = new ShoulderCamera();
    cam.setAspect(16 / 9);
    cam.update(f, b.pieces, 1 / 60, b.time);
    cam.camera.updateMatrixWorld();
    f.aim = { yaw: f.look, pitch: -0.02 };
    const still = crosshair(f, b, cam.camera, 960, 540)!.gap;
    f.vel = { x: 0, z: 5 };
    expect(crosshair(f, b, cam.camera, 960, 540)!.gap).toBeGreaterThan(still + 5);
  });
});
