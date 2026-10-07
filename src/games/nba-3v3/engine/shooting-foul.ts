import { airborne } from "./athlete";
import { blockTiming } from "./block";
import { inFront } from "./fouls";
import type { Match } from "./match";
import type { ShotKind } from "./shot-model";
import type { Athlete } from "./types";
import { clamp, dir2, dist2 } from "./vec";

/**
 * How a referee reads contact on a shot. Only clear contact is called:
 * most contests are let go, the way the league lets a good contest be.
 */
export const SHOT_FOUL = {
  /** Further than this from the shooter there is no body to touch, on a jumper and at the rim. */
  reachJumper: 0.95,
  reachRim: 1.1,
  /** A defender on the floor this close at the rim can be run into. */
  standing: 0.75,
  /** Chance with perfect timing, and the extra for a jump that is all wrong. */
  base: 0.02,
  late: 0.09,
  /** Running into the shooter, per metre a second, up to `lungeMost`. */
  lunge: 0.06,
  lungeMost: 0.25,
  /** Square in front a referee lets most contact go; from the side or behind he sees the arm. */
  front: 0.5,
  side: 1.3,
  /** At the rim bodies meet more, unless the finish went round the man. */
  rim: 1.2,
} as const;

/**
 * Contact on a shot. A defender who goes straight up in front of the
 * shooter, at the top of the jump, is clean. Jumping in late, from the
 * side or flying into the shooter's body is a foul more often, and so
 * is being run over at the rim. A layup made to go round the man
 * (`evade`, see `finish/layups.ts`) meets less of him. Returns the
 * fouler, or null.
 */
export function rollShootingFoul(m: Match, shooter: Athlete, kind: ShotKind, evade = 0): Athlete | null {
  if (kind === "free") return null;
  const jumper = kind === "jumper";
  const reach = jumper ? SHOT_FOUL.reachJumper : SHOT_FOUL.reachRim;
  for (const d of m.opponents(shooter.team)) {
    const dist = dist2(d, shooter);
    const up = d.action.kind === "block" && airborne(d);
    // At the rim a defender standing in the way can be run into; on a jumper only a jump makes contact.
    if (dist > reach || (!up && (jumper || dist > SHOT_FOUL.standing))) continue;
    const close = clamp((reach - dist) / 0.5, 0, 1);
    const late = up ? 1 - blockTiming(d) : 0.4;
    const toward = dir2(d, shooter);
    const lunge = clamp(((d.vx * toward.x + d.vz * toward.z) * SHOT_FOUL.lunge), 0, SHOT_FOUL.lungeMost);
    const angle = inFront(d, shooter) ? SHOT_FOUL.front : SHOT_FOUL.side;
    const where = jumper ? 1 : SHOT_FOUL.rim * (1 - evade * 0.5);
    const chance = close * (SHOT_FOUL.base + SHOT_FOUL.late * late + lunge) * angle * where;
    if (chance > 0 && m.rng() < chance) return d;
  }
  return null;
}
