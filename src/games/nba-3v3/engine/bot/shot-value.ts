import { charOf } from "../athlete";
import { contestFor } from "../contest";
import { isThree, rimDistance } from "../court";
import type { Match } from "../match";
import { greenHalfMs, makeChance, type ShotContext } from "../shot-model";
import { SHOT } from "../tuning";
import type { Athlete } from "../types";
import { clamp } from "../vec";

/** How far a computer player's release strays from the green centre, in milliseconds. */
export function releaseSpread(shooting: number): number {
  return 260 - shooting * 14;
}

/** The spread of `gaussian` in rng.ts is 0.7 of the width it is given. */
const SIGMA = 0.7;

/** The chance a normal draw lands within `half` of zero: erf(half / (sd * sqrt 2)). */
function within(half: number, sd: number): number {
  const x = half / (sd * Math.SQRT2);
  // Abramowitz and Stegun 7.1.26, plenty for a bot's hunch.
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return clamp(1 - poly * Math.exp(-x * x), 0, 1);
}

/**
 * The points a jumper from here is worth on average for this computer
 * player: the meter as it would time it, the distance, the stat and the
 * defence. Defenders close by are expected to jump, so they count more
 * than they do standing still.
 */
export function jumperValue(m: Match, a: Athlete): number {
  const st = charOf(a).stats;
  const sd = releaseSpread(st.shooting) * SIGMA;
  const half = greenHalfMs(st.shooting, a.onFire);
  const pGreen = within(half, sd);
  const pGood = within(half * SHOT.goodSpread, sd) - pGreen;
  const c = contestFor(a, m.opponents(a.team), "jumper");
  const ctx: ShotContext = { kind: "jumper", grade: "perfect", distance: rimDistance(a), shooting: st.shooting, contest: clamp(c.contest * 1.6, 0, 1), strengthEdge: 0, onFire: a.onFire };
  const chance =
    pGreen * makeChance(ctx) + pGood * makeChance({ ...ctx, grade: "good" }) + (1 - pGreen - pGood) * makeChance({ ...ctx, grade: "late" });
  return chance * (isThree(a) ? 3 : 2);
}
