import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildOf } from "../anim/leg-ik";
import { FootLock } from "./foot-locks";

const b = buildOf(1.8, 0.5);
const plant = { x: 0.12, y: b.ground, z: 0, toe: 0, plant: true };

/** A figure standing at (x, z) with one foot planted, as the renderer drives it. */
function standAt(lock: FootLock, root: THREE.Object3D, ankle: THREE.Object3D, x: number, z: number) {
  root.position.set(x, 0, z);
  root.updateWorldMatrix(true, true);
  const foot = lock.resolve(plant, root, b, 1 / 60);
  if (foot) ankle.position.set(foot.x, foot.y, foot.z);
  root.updateWorldMatrix(true, true);
  lock.remember(ankle);
  return foot;
}

describe("foot lock", () => {
  it("keeps a planted foot on its spot while the body is over it", () => {
    const root = new THREE.Object3D();
    const ankle = new THREE.Object3D();
    root.add(ankle);
    const lock = new FootLock();
    standAt(lock, root, ankle, 10, 5);
    standAt(lock, root, ankle, 10, 5);
    const foot = standAt(lock, root, ankle, 10.1, 5)!;
    expect(foot.x).toBeCloseTo(plant.x - 0.1, 2);
  });

  // The bug: near the centre spot the reach was measured in world units, so a foot never let go there.
  it("lets go when the body is placed far away, even near the centre spot", () => {
    const root = new THREE.Object3D();
    const ankle = new THREE.Object3D();
    root.add(ankle);
    const lock = new FootLock();
    standAt(lock, root, ankle, -0.35, 0);
    standAt(lock, root, ankle, -0.35, 0);
    // Put down for a free kick 2.3 metres away.
    for (let i = 0; i < 5; i++) standAt(lock, root, ankle, -2.45, -1.2);
    const foot = standAt(lock, root, ankle, -2.45, -1.2)!;
    expect(Math.hypot(foot.x - plant.x, foot.z - plant.z)).toBeLessThan(0.05);
  });
});
