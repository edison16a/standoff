import { describe, expect, it } from "vitest";
import { CUTS, cutAt, PERIOD, ramp } from "./trailer";

describe("the trailer's edit", () => {
  it("covers every moment of the loop with exactly one shot", () => {
    expect(CUTS.reduce((sum, cut) => sum + (cut.to - cut.from), 0)).toBeCloseTo(PERIOD, 6);
    for (let i = 0; i < PERIOD * 20; i++) {
      const t = (i + 0.5) / 20;
      const hits = CUTS.filter((cut) => [t, t + PERIOD].some((at) => at >= cut.from && at < cut.to));
      expect(hits).toHaveLength(1);
    }
  });

  it("repeats on its period and joins mid shot", () => {
    for (const t of [0, 0.7, 4.2, 8.95]) {
      expect(cutAt(t + PERIOD).cut).toBe(cutAt(t).cut);
      expect(cutAt(t + PERIOD).u).toBeCloseTo(cutAt(t).u, 9);
    }
    expect(cutAt(PERIOD - 0.01).cut).toBe(cutAt(0.01).cut);
  });

  it("only ever moves the round forward within a shot", () => {
    for (const cut of CUTS) {
      for (let u = 0.05; u < cut.to - cut.from; u += 0.05) expect(cut.clock(u)).toBeGreaterThan(cut.clock(u - 0.05));
    }
  });
});

describe("ramp", () => {
  it("integrates the speed curve without jumps", () => {
    const time = ramp(2, [[0, 1], [1, 0], [2, 0], [3, 1]]);
    expect(time(1)).toBeCloseTo(2.5);
    expect(time(2)).toBeCloseTo(2.5);
    expect(time(4)).toBeCloseTo(4);
    expect(time(1.001) - time(0.999)).toBeLessThan(0.001);
  });
});
