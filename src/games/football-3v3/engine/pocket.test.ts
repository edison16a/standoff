import { describe, expect, it } from "vitest";
import { seatStatus } from "./status";
import { accuracyOf, pocketPressure, POCKET, pressOf, pressuredThrow } from "./pocket";
import { Rng } from "./rng";
import { bySeat, peopleMatch, snap } from "./test-helpers";

describe("pressure on the passer", () => {
  it("counts a defender more the closer he is, and nothing outside its reach", () => {
    expect(pressOf(POCKET.far + 0.5)).toBe(0);
    expect(pressOf(POCKET.near - 0.2)).toBe(1);
    expect(pressOf(3)).toBeGreaterThan(pressOf(4));
    expect(accuracyOf(0)).toBe(1);
    expect(accuracyOf(1)).toBeCloseTo(POCKET.floor, 6);
  });

  it("throws true from a clean pocket, rolling no dice, and wider the harder the rush", () => {
    const vel = { x: 18, y: 4, z: 2 };
    const rng = new Rng(3);
    expect(pressuredThrow(vel, 0, rng)).toEqual(vel);
    expect(rng.next()).toBe(new Rng(3).next());
    const spread = (p: number) => {
      const r = new Rng(11);
      let sum = 0;
      for (let i = 0; i < 400; i++) {
        const v = pressuredThrow(vel, p, r);
        sum += Math.abs(Math.atan2(v.z, v.x) - Math.atan2(vel.z, vel.x));
      }
      return sum / 400;
    };
    expect(spread(1)).toBeGreaterThan(spread(0.3) * 2.5);
    expect(spread(1)).toBeGreaterThan(0.04);
  });

  it("drops the accuracy on the QB's phone as a defender closes on him", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const clean = seatStatus(m, 0)!.aim!;
    expect(clean).toBeGreaterThan(0.9);
    const d = bySeat(m, 3);
    d.x = qb.x + 1.2;
    d.z = qb.z;
    expect(pocketPressure(m, qb)).toBeGreaterThan(0.9);
    expect(seatStatus(m, 0)!.aim!).toBeLessThan(0.45);
    // A defender's phone shows no aim at all.
    expect(seatStatus(m, 2)!.aim).toBeNull();
  });
});
