import { describe, expect, it } from "vitest";
import { ShoulderCamera } from "./shoulder-camera";

const STEP = 1 / 60;

describe("ShoulderCamera", () => {
  it("draws the very first frame of a new round from its new place", () => {
    const camera = new ShoulderCamera(62);
    camera.update({ x: -1, z: 0 }, { x: 1, z: 0 }, STEP, 0);
    // Round two starts after the break with the boxers somewhere else in the ring.
    const me = { x: 1.2, z: 1 };
    const them = { x: -0.4, z: 0.6 };
    camera.update(me, them, STEP, 0, true);
    const first = camera.camera.position.clone();
    const firstAim = camera.camera.quaternion.clone();
    camera.update(me, them, STEP, 0);
    // The frame after it barely moves: no one frame jump from where the last round ended.
    expect(camera.camera.position.distanceTo(first)).toBeLessThan(0.01);
    expect(camera.camera.quaternion.angleTo(firstAim)).toBeLessThan(0.01);
  });

  it("follows smoothly when not told to jump", () => {
    const camera = new ShoulderCamera(62);
    camera.update({ x: -1, z: 0 }, { x: 1, z: 0 }, STEP, 0);
    const before = camera.camera.position.clone();
    camera.update({ x: 1.2, z: 1 }, { x: -0.4, z: 0.6 }, STEP, 0);
    expect(camera.camera.position.distanceTo(before)).toBeLessThan(0.3);
  });
});
