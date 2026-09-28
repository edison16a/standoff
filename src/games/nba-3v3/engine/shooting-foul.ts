import { airborne } from "./athlete";
import { blockTiming } from "./block";
import { inFront } from "./fouls";
import type { Match } from "./match";
import type { ShotKind } from "./shot-model";
import type { Athlete } from "./types";
import { clamp, dir2, dist2 } from "./vec";

/**
 * Contact on a shot. A defender who goes straight up in front of the
 * shooter, at the top of the jump, is clean. Jumping in late, from the
 * side or flying into the shooter's body is a foul more often, and so
 * is being run over at the rim. Returns the fouler, or null.
 */
export function rollShootingFoul(m: Match, shooter: Athlete, kind: ShotKind): Athlete | null {
  if (kind === "free") return null;
  const reach = kind === "jumper" ? 1.05 : 1.2;
  for (const d of m.opponents(shooter.team)) {
    const dist = dist2(d, shooter);
    const up = d.action.kind === "block" && airborne(d);
    // At the rim a defender standing in the way can be run into; on a jumper only a jump makes contact.
    if (dist > reach || (!up && (kind === "jumper" || dist > 0.8))) continue;
    const close = clamp((reach - dist) / 0.5, 0, 1);
    const late = up ? 1 - blockTiming(d) : 0.4;
    const toward = dir2(d, shooter);
    const lunge = clamp((d.vx * toward.x + d.vz * toward.z) / 4, 0, 0.5);
    const angle = inFront(d, shooter) ? 0.6 : 1.4;
    const chance = close * (0.08 + 0.22 * late + lunge) * angle * (kind === "jumper" ? 1 : 1.25);
    if (chance > 0 && m.rng() < chance) return d;
  }
  return null;
}
