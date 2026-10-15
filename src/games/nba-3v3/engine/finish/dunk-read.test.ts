import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { RIM_SPOT, rimDistance } from "../court";
import { Match, type Entry } from "../match";
import { seeded } from "../rng";
import { STEP } from "../tuning";
import { readApproach } from "./approach";
import { dunkChances } from "./dunk-fail";
import { planFinish } from "./plan";

const ENTRIES: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 1 ? 0 : null }));

/** The Dunker (id 1) with the ball `out` metres in front of the rim at `speed` toward it, everyone else far off. */
function dunkerAt(out: number, speed: number): Match {
  const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 1 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: i === 1 ? RIM_SPOT.x : -6 + i, z: i === 1 ? RIM_SPOT.z + out : 11, vx: 0, vz: i === 1 ? -speed : 0, auto: i !== 1, action: { kind: "none" } }));
  m.ball.holder = 1;
  return m;
}

const oddsAt = (out: number, speed: number) => {
  const m = dunkerAt(out, speed);
  const a = m.athletes[1]!;
  return dunkChances(m, a, readApproach(m, a)).odds;
};

/**
 * The owner's rule: a dunk called at a bad time fails, a good one lands.
 * A double tap is read a beat after the first press, so a late call
 * often lands right under the ring. That is late, not too far out.
 */
describe("reading a person's dunk off the court", () => {
  it("lands a dunk called in stride from a good spot", () => {
    expect(oddsAt(2.4, 5).make).toBeGreaterThan(0.95);
  });

  it("goes straight up from under the ring standing still, never comes up short there", () => {
    const o = oddsAt(0.4, 0);
    expect(o.short).toBe(0);
    expect(o.make).toBeGreaterThan(0.9);
  });

  it("jams a late call at a sprint under the ring into the iron now and then, still never short", () => {
    const o = oddsAt(0.5, 5.5);
    expect(o.short).toBe(0);
    expect(o.clang).toBeGreaterThan(0.25);
    expect(o.make).toBeLessThan(0.8);
  });

  it("never steps back out from the rim to come up short", () => {
    const m = dunkerAt(0.6, 0);
    const a = m.athletes[1]!;
    const act = planFinish(seeded(2), a, { dunk: true, layup: null, style: "flush", hand: 1, side: 1 }, { x: a.x, y: 1, z: a.z }, "short");
    expect(rimDistance(act.to)).toBeLessThanOrEqual(rimDistance(a) + 1e-6);
  });
});
