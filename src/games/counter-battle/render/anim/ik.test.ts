import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { solveLimb } from "./ik";

/** A two bone chain hanging from a parent, like a leg or an arm. */
function chain(a: number, b: number) {
  const parent = new THREE.Object3D();
  const upper = new THREE.Object3D();
  const middle = new THREE.Object3D();
  const end = new THREE.Object3D();
  upper.position.set(0.1, 1, 0);
  middle.position.set(0, -a, 0);
  end.position.set(0, -b, 0);
  parent.add(upper);
  upper.add(middle);
  middle.add(end);
  return { parent, upper, middle, end };
}

const at = (o: THREE.Object3D) => {
  o.updateWorldMatrix(true, false);
  return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
};

describe("two bone IK", () => {
  it("puts the end of the limb on a target it can reach", () => {
    const c = chain(0.44, 0.43);
    for (const target of [new THREE.Vector3(0.12, 0.3, 0.3), new THREE.Vector3(0.1, 0.2, -0.2), new THREE.Vector3(0.3, 0.6, 0.1)]) {
      const miss = solveLimb({ upper: c.upper, middle: c.middle, a: 0.44, b: 0.43, bend: 1 }, target, new THREE.Vector3(0, 0, 1));
      expect(miss).toBe(0);
      expect(at(c.end).distanceTo(target)).toBeLessThan(1e-4);
    }
  });

  it("bends a knee forward, toward its pole", () => {
    const c = chain(0.44, 0.43);
    solveLimb({ upper: c.upper, middle: c.middle, a: 0.44, b: 0.43, bend: 1 }, new THREE.Vector3(0.1, 0.35, 0.05), new THREE.Vector3(0, 0, 1));
    expect(at(c.middle).z).toBeGreaterThan(0.2);
    // The shin swings back from the knee: a positive turn about the knee's own x.
    expect(c.middle.rotation.x).toBeGreaterThan(0);
  });

  it("bends an elbow toward its pole, and reaches as far as it can for a target out of reach", () => {
    const c = chain(0.29, 0.27);
    solveLimb({ upper: c.upper, middle: c.middle, a: 0.29, b: 0.27, bend: -1 }, new THREE.Vector3(0.1, 0.8, 0.35), new THREE.Vector3(0, -1, -0.3));
    expect(at(c.middle).y).toBeLessThan(0.85);
    expect(c.middle.rotation.x).toBeLessThan(0);
    const far = new THREE.Vector3(0.1, 1, 2);
    const miss = solveLimb({ upper: c.upper, middle: c.middle, a: 0.29, b: 0.27, bend: -1 }, far, new THREE.Vector3(0, -1, 0));
    expect(miss).toBeGreaterThan(1);
    // Straight at it, as near as the arm allows.
    expect(at(c.end).distanceTo(far)).toBeCloseTo(far.distanceTo(at(c.upper)) - 0.56, 2);
  });
});
