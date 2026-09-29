import { describe, expect, it } from "vitest";
import { DEFAULT_ORBIT, orbitPose } from "./orbit";

const shot = { ...DEFAULT_ORBIT, centre: { x: 2, y: 1, z: -1 }, radius: 4, height: 1.5, lookHeight: 1, pullBack: 2, rise: 2, bob: 0 };

function distance(t: number, s = shot): number {
  const p = orbitPose(s, t).position;
  return Math.hypot(p.x - s.centre.x, p.z - s.centre.z);
}

describe("orbitPose", () => {
  it("opens wide and high, then settles on its orbit", () => {
    expect(distance(0)).toBeCloseTo(8, 5);
    expect(orbitPose(shot, 0).position.y).toBeCloseTo(1 + 1.5 + 2, 5);
    expect(distance(shot.introS)).toBeCloseTo(4, 5);
    expect(distance(shot.introS + 10)).toBeCloseTo(4, 5);
    expect(orbitPose(shot, shot.introS + 3).position.y).toBeCloseTo(2.5, 5);
  });

  it("always looks at the centre, over it by the look height", () => {
    expect(orbitPose(shot, 5).target).toEqual({ x: 2, y: 2, z: -1 });
  });

  it("circles at its speed", () => {
    const a = orbitPose({ ...shot, introS: 0, startAngle: 0, speed: Math.PI / 2 }, 1).position;
    expect(a.x).toBeCloseTo(2 + 4, 5);
    expect(a.z).toBeCloseTo(-1, 5);
  });

  it("an arc swings back and forth and never passes its half width", () => {
    const arc = { ...shot, introS: 0, arc: 0.5, speed: 0.4 };
    for (let t = 0; t < 30; t += 0.5) {
      const p = orbitPose(arc, t).position;
      expect(Math.abs(Math.atan2(p.x - 2, p.z + 1))).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });
});
