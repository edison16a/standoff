import { airborne, buildOf } from "../athlete";
import { extraReach } from "../contest";
import { RIM_SPOT } from "../court";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { clamp, dir2, dist2 } from "../vec";
import type { Approach } from "./approach";
import { DUNK_ODDS, dunkRating, type DunkRead, type Stopper } from "./dunk-odds";
import { dunkHeadroom } from "./plan";

/**
 * Reads a dunk attempt off the court for the odds (`dunk-odds.ts`):
 * how far out and how fast he goes up, how square and balanced he is,
 * his rating, and the defender nearest the rim who could meet it there.
 */
export function readDunk(m: Match, a: Athlete, ap: Approach): { read: DunkRead; stopper: Athlete | null } {
  const s = buildOf(a).stats;
  const to = dir2(a, RIM_SPOT);
  const heading = ap.speed > 0.3 ? (a.vx * to.x + a.vz * to.z) / ap.speed : 1;
  // Slow legs after a landing, a foot planted hard in a cut, or a lunge that missed: he goes up off balance.
  const offBalance = clamp((a.recover > 0 ? 0.35 : 0) + (a.plant > 0 ? 0.2 : 0) + (a.whiff > 0 ? 0.5 : 0), 0, 1);
  const man = stopperFor(m, a);
  const read: DunkRead = {
    distance: ap.distance, speed: ap.speed, heading, offBalance,
    rating: dunkRating(s.speed, s.strength, dunkHeadroom(a)),
    canDunk: ap.canDunk, stopper: man ? stopperRead(a, man, ap) : null,
  };
  return { read, stopper: man };
}

/** The defender closest to the rim who is near enough to get to the slam. */
function stopperFor(m: Match, a: Athlete): Athlete | null {
  let best: Athlete | null = null;
  let bestD: number = DUNK_ODDS.far;
  for (const o of m.opponents(a.team)) {
    const d = dist2(o, RIM_SPOT);
    if (d < bestD && o.action.kind !== "stumble") {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function stopperRead(a: Athlete, man: Athlete, ap: Approach): Stopper {
  const threat = ap.threat?.id === man.id ? ap.threat : null;
  return {
    dist: dist2(man, RIM_SPOT),
    spot: threat?.spot ?? "rim",
    up: airborne(man),
    edge: buildOf(a).stats.strength - buildOf(man).stats.strength,
    reach: extraReach(man),
    defence: buildOf(man).stats.defence,
  };
}
