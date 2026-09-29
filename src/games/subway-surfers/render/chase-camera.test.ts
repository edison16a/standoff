import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Run } from "../engine/run";
import { RUNNER, SPEED } from "../engine/tuning";
import { ChaseCamera } from "./chase-camera";

/** Just enough of a run for the camera: a runner on the ground at a speed. */
function runAt(speed: number): Run {
  return {
    runner: { x: 0, y: 0, distance: 100, grounded: true },
    powers: { has: () => false },
    crashed: null,
    speed,
  } as unknown as Run;
}

function settle(run: Run, seconds = 4): ChaseCamera {
  const chase = new ChaseCamera();
  chase.reset(run);
  for (let i = 0; i < seconds * 60; i++) {
    chase.update(run, 1 / 60, i / 60);
    chase.setAspect(16 / 9);
  }
  return chase;
}

/** Where a point shows on screen, from -1 at the bottom to 1 at the top. */
function screenY(chase: ChaseCamera, y: number, z: number): number {
  chase.camera.updateMatrixWorld();
  return new THREE.Vector3(0, y, z).project(chase.camera).y;
}

describe("the chase camera", () => {
  it("sits behind and above, with the whole runner in the lower middle of a wide screen", () => {
    const chase = settle(runAt(SPEED.start));
    const eye = chase.camera.position;
    expect(eye.z).toBeGreaterThan(-100 + 5);
    expect(eye.y).toBeGreaterThan(RUNNER.height * 2);
    const feet = screenY(chase, 0, -100);
    const head = screenY(chase, RUNNER.height, -100);
    expect(feet).toBeGreaterThan(-0.8);
    expect(feet).toBeLessThan(-0.5);
    expect(head).toBeLessThan(0);
    // A roll keeps the body low, and it still shows well clear of the bottom edge.
    expect(screenY(chase, RUNNER.rollHeight / 2, -99.5)).toBeGreaterThan(-0.8);
  });

  it("widens the view as the run gets faster", () => {
    const slow = settle(runAt(SPEED.start)).camera.fov;
    const fast = settle(runAt(SPEED.max)).camera.fov;
    expect(fast).toBeGreaterThan(slow + 5);
  });

  it("kicks the view wider on a big moment, then settles back", () => {
    const run = runAt(SPEED.start);
    const chase = settle(run);
    const calm = chase.camera.fov;
    chase.kick(8);
    chase.update(run, 1 / 60, 10);
    chase.setAspect(16 / 9);
    expect(chase.camera.fov).toBeGreaterThan(calm + 6);
    for (let i = 0; i < 180; i++) chase.update(run, 1 / 60, 10 + i / 60);
    chase.setAspect(16 / 9);
    expect(chase.camera.fov).toBeLessThan(calm + 0.5);
  });

  it("shakes on a knock, and the shake dies away", () => {
    const run = runAt(SPEED.start);
    const chase = settle(run);
    const rest = chase.camera.position.clone();
    chase.bump(1.4);
    let moved = 0;
    for (let i = 0; i < 12; i++) {
      chase.update(run, 1 / 60, 20 + i / 60);
      moved = Math.max(moved, chase.camera.position.distanceTo(rest));
    }
    expect(moved).toBeGreaterThan(0.1);
    for (let i = 0; i < 180; i++) chase.update(run, 1 / 60, 21 + i / 60);
    expect(chase.camera.position.distanceTo(rest)).toBeLessThan(0.02);
  });
});
