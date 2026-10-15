import { describe, expect, it } from "vitest";
import { topSpeed } from "./body";
import { SHED, burstPace } from "./burst";
import type { Match } from "./match";
import { pressRush, SHED_ODDS, shedOdds } from "./rush-shed";
import { clinchOf } from "./support/clinch";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import type { Athlete } from "./types";

/** The Blaze QB, a person, held in a block by a Storm support player out in space. */
function heldRusher(m: Match): { d: Athlete; o: Athlete } {
  snap(m);
  const d = bySeat(m, 2);
  const o = m.athletes.find((a) => a.team === 0 && a.role === "support" && !a.deep)!;
  d.x = o.x + 0.9;
  d.z = o.z;
  m.support.clinches.push({ o: o.id, d: d.id, move: { kind: "pass", t: 1 }, surge: 0, next: 1, v: 0, passPro: true });
  d.blocked = 0.15;
  return { d, o };
}

/** Forces the rush's own dice to come up `value` from now on. */
const fixDice = (m: Match, value: number) => Object.assign(m.playRng, { next: () => value });

describe("breaking free with Rush", () => {
  it("gets likelier with power and with every second the QB holds the ball, up to a cap", () => {
    expect(shedOdds(5, 0)).toBeCloseTo(SHED_ODDS.base, 6);
    expect(shedOdds(5, 2)).toBeGreaterThan(shedOdds(5, 1));
    expect(shedOdds(9, 1)).toBeGreaterThan(shedOdds(4, 1));
    expect(shedOdds(10, 30)).toBeLessThanOrEqual(SHED_ODDS.max);
    // A computer rusher at its worst gets less than a person; at its best the same.
    expect(shedOdds(6, 2, 0)).toBeLessThan(shedOdds(6, 2));
    expect(shedOdds(6, 2, 1)).toBeCloseTo(shedOdds(6, 2), 6);
  });

  it("frees a held rusher who wins: the block is gone and he plays the break free", () => {
    const m = peopleMatch();
    const { d, o } = heldRusher(m);
    fixDice(m, 0);
    pressRush(m, d);
    expect(clinchOf(m, d.id)).toBeNull();
    expect(d.burst).toMatchObject({ t: 0, dur: SHED.dur });
    expect(d.blocked).toBe(0);
    // The blocker he beat stumbles away.
    expect(o.stumble).not.toBeNull();
  });

  it("gives him a burst of speed once he is through, which fades back to his own", () => {
    const m = peopleMatch();
    const { d } = heldRusher(m);
    const own = topSpeed(d, false);
    fixDice(m, 0);
    pressRush(m, d);
    expect(topSpeed(d, false)).toBeLessThan(own);
    d.burst!.t = SHED.rip + 0.1;
    expect(topSpeed(d, false)).toBeCloseTo(own * SHED.boost, 6);
    d.burst!.t = d.burst!.dur - 0.01;
    expect(burstPace(d)).toBeLessThan(1.02);
    run(m, SHED.dur);
    expect(d.burst).toBeNull();
  });

  it("leaves a rusher who loses in the block, and a free man only rushes", () => {
    const m = peopleMatch();
    const { d } = heldRusher(m);
    fixDice(m, 0.999);
    pressRush(m, d);
    expect(d.burst).toBeNull();
    expect(clinchOf(m, d.id)).not.toBeNull();
    expect(d.rushT).toBeGreaterThan(0);
    const free = bySeat(m, 3);
    free.blocked = 0;
    fixDice(m, 0);
    pressRush(m, free);
    expect(free.burst).toBeNull();
  });

  it("never breaks free in the game played as it was filmed", () => {
    const m = peopleMatch({ filmed: true });
    const { d } = heldRusher(m);
    fixDice(m, 0);
    pressRush(m, d);
    expect(d.burst).toBeNull();
  });

  it("gets a person's QB brought down sooner if he stands in the pocket", () => {
    let sooner = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const times = [false, true].map((filmed) => {
        const m = peopleMatch({ seed, level: "hard", filmed });
        snap(m);
        const t0 = m.time;
        for (let t = 0; t < 12 && m.phase === "live"; t += STEP) m.step(STEP);
        return m.time - t0;
      });
      if (times[0]! < times[1]!) sooner++;
    }
    expect(sooner).toBeGreaterThanOrEqual(4);
  });
});
