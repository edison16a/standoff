import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { solveElbow } from "./arm-ik";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("solveElbow", () => {
  it("keeps both bones their length and reaches a wrist in range", () => {
    const shoulder = v(0.27, 0.68, 0);
    const wrist = v(0.18, 0.62, 0.55);
    const elbow = new THREE.Vector3();
    const reached = solveElbow(shoulder, wrist, 0.33, 0.33, v(1, -0.6, -0.2), elbow);
    expect(elbow.distanceTo(shoulder)).toBeCloseTo(0.33, 5);
    expect(elbow.distanceTo(wrist)).toBeCloseTo(0.33, 5);
    expect(reached.distanceTo(wrist)).toBeLessThan(1e-6);
  });

  it("bends the elbow toward the pole", () => {
    const shoulder = v(0, 0, 0);
    const wrist = v(0, 0, 0.4);
    const elbow = new THREE.Vector3();
    solveElbow(shoulder, wrist, 0.3, 0.3, v(1, 0, 0), elbow);
    expect(elbow.x).toBeGreaterThan(0.1);
    solveElbow(shoulder, wrist, 0.3, 0.3, v(-1, 0, 0), elbow);
    expect(elbow.x).toBeLessThan(-0.1);
  });

  it("straightens toward a wrist out of reach instead of pulling apart", () => {
    const shoulder = v(0, 0, 0);
    const elbow = new THREE.Vector3();
    const reached = solveElbow(shoulder, v(0, 0, 2), 0.3, 0.3, v(0, -1, 0), elbow);
    expect(reached.z).toBeCloseTo(0.6, 3);
    expect(elbow.distanceTo(shoulder)).toBeCloseTo(0.3, 4);
  });
});
