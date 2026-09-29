import { describe, expect, it } from "vitest";
import { limitsFor, steer } from "./body";
import { STEP } from "./tuning";
import { add, len, v2, type Vec2 } from "./vec";

const runner = limitsFor(90, 9.5, 0.7, 0.8);

function run(vel: Vec2, want: Vec2, seconds: number, lim = runner): { vel: Vec2; path: Vec2[] } {
  let v = vel;
  let p = v2();
  const path: Vec2[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    v = steer(v, want, lim, STEP);
    p = add(p, v, STEP);
    path.push(p);
  }
  return { vel: v, path };
}

describe("heavy bodies", () => {
  it("take seconds to reach top speed, not a frame", () => {
    expect(len(run(v2(), v2(9.5, 0), 0.5).vel)).toBeLessThan(4);
    expect(len(run(v2(), v2(9.5, 0), 4).vel)).toBeGreaterThan(9);
  });

  it("feel heavier with more mass", () => {
    const big = limitsFor(130, 9.5, 0.7, 0.8);
    expect(len(run(v2(), v2(9.5, 0), 1, big).vel)).toBeLessThan(len(run(v2(), v2(9.5, 0), 1).vel));
  });

  it("turn wider the faster they run", () => {
    // Asked to turn a right angle, a fast runner drifts further before the new line.
    const drift = (speed: number) => Math.max(...run(v2(speed, 0), v2(0, 9.5), 1.5).path.map((p) => p.x));
    expect(drift(9)).toBeGreaterThan(drift(3) * 2);
  });

  it("brake before reversing at full speed", () => {
    const { vel, path } = run(v2(9.5, 0), v2(-9.5, 0), 0.3);
    expect(vel.x).toBeGreaterThan(0);
    expect(path[path.length - 1]!.x).toBeGreaterThan(1.5);
  });

  it("never beat their top speed while turning", () => {
    let v = v2(9.5, 0);
    for (let i = 0; i < 300; i++) v = steer(v, v2(Math.cos(i / 20) * 9.5, Math.sin(i / 20) * 9.5), runner, STEP);
    expect(len(v)).toBeLessThanOrEqual(9.5 + 1e-6);
  });
});
