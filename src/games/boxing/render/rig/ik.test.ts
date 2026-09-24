import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { solveTwoBone } from "./ik";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("two bone reach", () => {
  it("keeps both bones their length and lands on a target in reach", () => {
    const root = v(0, 1.4, 0);
    const target = v(0.1, 1.5, 0.4);
    const { middle, end } = solveTwoBone(root, target, v(0.5, 1.2, -0.2), 0.3, 0.27);
    expect(end.distanceTo(target)).toBeLessThan(1e-6);
    expect(middle.distanceTo(root)).toBeCloseTo(0.3, 5);
    expect(middle.distanceTo(end)).toBeCloseTo(0.27, 5);
  });

  it("bends toward the pole", () => {
    const root = v(0, 0, 0);
    const { middle } = solveTwoBone(root, v(0, 0, 0.4), v(0, -1, 0.2), 0.3, 0.27);
    expect(middle.y).toBeLessThan(-0.05);
  });

  it("reaches straight for a target out of range", () => {
    const root = v(0, 0, 0);
    const { middle, end } = solveTwoBone(root, v(0, 0, 2), v(0, -1, 0), 0.3, 0.27);
    expect(end.z).toBeCloseTo(0.57, 2);
    expect(Math.abs(middle.y)).toBeLessThan(0.01);
  });

  it("copes with a pole on the line of reach", () => {
    const { middle } = solveTwoBone(v(0, 0, 0), v(0, 0, 0.3), v(0, 0, 1), 0.3, 0.27);
    expect(Number.isFinite(middle.x + middle.y + middle.z)).toBe(true);
  });
});
