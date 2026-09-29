import { describe, expect, it } from "vitest";
import { orbitPose, type OrbitShot } from "./orbit";

const shot: OrbitShot = { centre: { x: 1, z: -2 }, radius: 4, height: 1.6, lookHeight: 1.2, angle: 0, speed: 0.2, pullBack: 2, rise: 1, introS: 2, bob: 0 };

function distance(t: number): number {
  const { position } = orbitPose(shot, t);
  return Math.hypot(position.x - 1, position.z + 2);
}

describe("orbitPose", () => {
  it("starts wide and high, then settles at its radius and height", () => {
    expect(distance(0)).toBeCloseTo(8);
    expect(orbitPose(shot, 0).position.y).toBeCloseTo(2.6);
    expect(distance(2)).toBeCloseTo(4);
    expect(distance(10)).toBeCloseTo(4);
    expect(orbitPose(shot, 10).position.y).toBeCloseTo(1.6);
  });

  it("closes in without ever backing out again", () => {
    let last = Infinity;
    for (let t = 0; t <= 3; t += 0.05) {
      const d = distance(t);
      expect(d).toBeLessThanOrEqual(last + 1e-9);
      last = d;
    }
  });

  it("circles at its speed and always looks at the centre", () => {
    const a = orbitPose(shot, 5);
    const b = orbitPose(shot, 6);
    const angle = (p: { x: number; z: number }) => Math.atan2(p.x - 1, p.z + 2);
    expect(angle(b.position) - angle(a.position)).toBeCloseTo(0.2);
    expect(a.target).toEqual({ x: 1, y: 1.2, z: -2 });
  });

  it("starts out along +z by default", () => {
    const { position } = orbitPose({ centre: { x: 0, z: 0 }, radius: 3, height: 1, lookHeight: 1, introS: 0.0001, speed: 0 }, 1);
    expect(position.x).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(3);
  });
});
