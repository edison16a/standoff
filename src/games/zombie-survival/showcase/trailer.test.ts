import { describe, expect, it } from "vitest";
import { CUTS, cutAt, PERIOD, ramp } from "./trailer";

describe("the trailer's edit", () => {
  it("covers every moment of the loop with exactly one shot", () => {
    const covered = CUTS.reduce((sum, cut) => sum + (cut.to - cut.from), 0);
    expect(covered).toBeCloseTo(PERIOD, 6);
    for (let i = 0; i < PERIOD * 20; i++) {
      const t = (i + 0.5) / 20;
      const hits = CUTS.filter((cut) => [t, t + PERIOD].some((at) => at >= cut.from && at < cut.to));
      expect(hits).toHaveLength(1);
    }
  });

  it("repeats on its period, so the capture's extra second matches its first", () => {
    for (const t of [0, 0.4, 3.3, 7.95]) {
      const a = cutAt(t);
      const b = cutAt(t + PERIOD);
      expect(b.cut).toBe(a.cut);
      expect(b.u).toBeCloseTo(a.u, 9);
    }
  });

  it("runs the loop's join through the middle of one shot", () => {
    expect(cutAt(PERIOD - 0.01).cut).toBe(cutAt(0.01).cut);
  });

  it("only ever moves the story forward within a shot", () => {
    for (const cut of CUTS) {
      const time = cut.kind === "chase" ? cut.story : cut.clock;
      for (let u = 0.05; u < cut.to - cut.from; u += 0.05) expect(time(u)).toBeGreaterThan(time(u - 0.05));
    }
  });
});

describe("ramp", () => {
  it("integrates the speed curve without jumps", () => {
    const time = ramp(2, [[0, 1], [1, 0], [2, 0], [3, 1]]);
    expect(time(0)).toBe(2);
    expect(time(1)).toBeCloseTo(2.5);
    expect(time(2)).toBeCloseTo(2.5);
    expect(time(3)).toBeCloseTo(3);
    expect(time(4)).toBeCloseTo(4);
    expect(time(1.001) - time(0.999)).toBeLessThan(0.001);
  });
});
