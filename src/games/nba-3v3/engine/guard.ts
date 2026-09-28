import { RIM_SPOT } from "./court";
import type { Match } from "./match";
import { GUARD } from "./tuning";
import type { Athlete } from "./types";
import { dir2, dist2, lerp, type V2 } from "./vec";

/**
 * Holding Guard on defence. The player shadows their man on their own,
 * staying between him and the rim a set gap off, a touch slower than a
 * player running flat out. The shadow reads the ball handler late: a
 * dribble drags it, a crossover or a spin leaves it behind, so the stick
 * is needed to catch up. Pushing the stick always takes over, and past
 * the range nothing happens until the defender runs back into it.
 */

export type GuardStatus = "off" | "on" | "far";

/** Who this defender guards: the opponent in the same role, else the computer's matchup, else the nearest. */
export function guardTarget(m: Match, a: Athlete): Athlete | null {
  const opponents = m.opponents(a.team);
  const same = opponents.find((o) => o.slot === a.slot);
  if (same) return same;
  const man = m.brains.manFor(a.id);
  if (man) return man;
  return opponents.sort((p, q) => dist2(p, a) - dist2(q, a))[0] ?? null;
}

/** Whether Guard is doing anything for this player now, for the phone to show. */
export function guardStatus(m: Match, a: Athlete): GuardStatus {
  if (!a.guard || m.phase !== "live" || m.offence === a.team) return "off";
  const man = guardTarget(m, a);
  return man && dist2(a, man) <= GUARD.range ? "on" : "far";
}

/** The spot to hold: tight between the ball handler and the rim, sagging toward the ball off it. */
export function guardSpot(m: Match, man: Athlete): V2 {
  const toRim = dir2(man, RIM_SPOT);
  const onBall = m.ball.holder === man.id;
  const gap = onBall ? GUARD.gap : GUARD.offGap;
  const spot = { x: man.x + toRim.x * gap, z: man.z + toRim.z * gap };
  if (onBall) return spot;
  const ball = m.ball.pos;
  return { x: lerp(spot.x, ball.x, GUARD.sag), z: lerp(spot.z, ball.z, GUARD.sag) };
}

/** How quickly the shadow catches up with where it should be: slower while the handler dribbles, slowest in a move. */
function trackRate(m: Match, man: Athlete): number {
  if (m.ball.holder !== man.id) return GUARD.track;
  if (man.action.kind === "move") return GUARD.moveTrack;
  const speed = Math.hypot(man.vx, man.vz);
  return speed > 1.2 ? GUARD.dribbleTrack : GUARD.track;
}

/** Steers a guarding player for one step, unless the stick is being used. */
export function steerGuard(m: Match, a: Athlete, dt: number): void {
  const man = guardStatus(m, a) === "on" ? guardTarget(m, a) : null;
  if (!man) {
    a.guardAim = null;
    return;
  }
  const want = guardSpot(m, man);
  const aim = a.guardAim ?? { x: a.x, z: a.z };
  const k = 1 - Math.exp(-trackRate(m, man) * dt);
  a.guardAim = { x: lerp(aim.x, want.x, k), z: lerp(aim.z, want.z, k) };
  if (Math.hypot(a.stick.x, a.stick.z) > GUARD.manual) return;
  const dx = a.guardAim.x - a.x;
  const dz = a.guardAim.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.08) {
    a.move = { x: 0, z: 0 };
    return;
  }
  // Eases in on arrival so the defender settles into a stance rather than jittering.
  const pace = Math.min(1, d / 0.6) * GUARD.pace;
  a.move = { x: (dx / d) * pace, z: (dz / d) * pace };
}
