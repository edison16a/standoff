import { airborne, charOf, standingReach } from "./athlete";
import { blockTiming } from "./block";
import { RIM_SPOT } from "./court";
import type { ShotKind } from "./shot-model";
import type { Athlete } from "./types";
import { clamp, dist2 } from "./vec";

export interface Contest {
  /** 0 wide open to 1 a hand in the face. */
  contest: number;
  /** The defender who could block this shot, if any jumped in time and in reach. */
  blocker: Athlete | null;
  blockChance: number;
  /** Shooter's strength minus the closest defender's, which decides contact at the rim. */
  edge: number;
}

/** How much longer than average a defender's reach is, in metres. */
export function extraReach(a: Athlete): number {
  return standingReach(a) + (airborne(a) ? a.y : 0) - 2.62;
}

/**
 * Sizes up the defence at the moment a shot leaves the hand. A defender
 * in front of the shooter contests; one who jumped with Block contests
 * fully and may block it, more likely with long arms, and for dunks
 * strength decides who wins at the rim. Timing matters: a jump caught
 * near the top of its arc, arms at full stretch, counts for the most;
 * one on the way up or already coming down, far less.
 */
export function contestFor(shooter: Athlete, defenders: readonly Athlete[], kind: ShotKind): Contest {
  let contest = 0;
  let blocker: Athlete | null = null;
  let blockChance = 0;
  let closest: Athlete | null = null;
  let closestD = Infinity;
  const toRimX = RIM_SPOT.x - shooter.x;
  const toRimZ = RIM_SPOT.z - shooter.z;
  const s = charOf(shooter).stats;
  for (const d of defenders) {
    const dist = dist2(d, shooter);
    if (dist < closestD) {
      closestD = dist;
      closest = d;
    }
    const long = extraReach(d);
    const range = (kind === "jumper" ? 2.3 : 1.9) + long * 0.8;
    const near = clamp((range - dist) / 1.4, 0, 1);
    const up = d.action.kind === "block" && airborne(d);
    const timing = blockTiming(d);
    const inFront = (d.x - shooter.x) * toRimX + (d.z - shooter.z) * toRimZ > -0.2 * dist;
    const value = near * (up ? 0.6 + 0.4 * timing : 0.5) * (inFront ? 1 : 0.55);
    contest = Math.max(contest, value);
    if (!up || dist > 1.3 + Math.max(0, long) * 0.8 + (kind === "jumper" ? 0 : 0.25)) continue;
    const ds = charOf(d).stats;
    const chance =
      kind === "jumper" ? 0.14 + long * 0.3 : kind === "layup" ? 0.28 + long * 0.25 : 0.18 + (ds.strength - s.strength) * 0.05 + long * 0.15;
    const timed = chance * (0.3 + 0.7 * timing);
    if (timed > blockChance) {
      blockChance = clamp(timed, 0.02, 0.5);
      blocker = d;
    }
  }
  const edge = closest ? s.strength - charOf(closest).stats.strength : 3;
  return { contest, blocker, blockChance, edge };
}
