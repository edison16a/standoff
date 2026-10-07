import { buildOf } from "./athlete";
import { guardScale } from "./build-effects";
import { RIM_SPOT } from "./court";
import type { Match } from "./match";
import { GUARD } from "./tuning";
import type { Athlete } from "./types";
import { dir2, dist2, lerp, type V2 } from "./vec";

/**
 * Holding Guard on defence. The player shadows their man on their own,
 * staying between him and the rim a set gap off, at full speed, and
 * closes out on him when he rises to shoot. The shadow reads a dribble
 * a little late and a move later still, so a move that wins buys a
 * step, and the stick can always do better. Pushing the stick always takes over. Guard
 * never gives up: past the range it sprints back to the man, and it
 * keeps the same man through passes and turnovers until let go.
 */

export type GuardStatus = "off" | "on" | "chase";

/** Who this defender guards: the man already locked on to, else the opponent in the same role, the computer's matchup, or the nearest. */
export function guardTarget(m: Match, a: Athlete): Athlete | null {
  const opponents = m.opponents(a.team);
  const locked = a.guardMan === null ? undefined : opponents.find((o) => o.id === a.guardMan);
  if (locked) return locked;
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
  if (!man) return "off";
  return dist2(a, man) <= GUARD.range ? "on" : "chase";
}

/**
 * The spot to hold: tight between the ball handler and the rim, read a
 * moment ahead on his run, sagging toward the ball off it. On a shooter
 * rising into his jumper it steps right up into him, for the hand up.
 */
export function guardSpot(m: Match, man: Athlete): V2 {
  const at = { x: man.x + man.vx * GUARD.lead, z: man.z + man.vz * GUARD.lead };
  const toRim = dir2(at, RIM_SPOT);
  const onBall = m.ball.holder === man.id;
  const shooting = onBall && man.action.kind === "shoot" && !man.action.released;
  const gap = shooting ? GUARD.closeGap : onBall ? GUARD.gap : GUARD.offGap;
  const spot = { x: at.x + toRim.x * gap, z: at.z + toRim.z * gap };
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
  const status = guardStatus(m, a);
  const man = status === "off" ? null : guardTarget(m, a);
  if (!man) {
    a.guardAim = null;
    return;
  }
  a.guardMan = man.id;
  const want = guardSpot(m, man);
  const aim = a.guardAim ?? { x: a.x, z: a.z };
  const k = 1 - Math.exp(-trackRate(m, man) * guardScale(buildOf(a).stats.defence) * dt);
  a.guardAim = { x: lerp(aim.x, want.x, k), z: lerp(aim.z, want.z, k) };
  if (Math.hypot(a.stick.x, a.stick.z) > GUARD.manual) return;
  const dx = a.guardAim.x - a.x;
  const dz = a.guardAim.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.08) {
    a.move = { x: 0, z: 0 };
    return;
  }
  // Eases in on arrival so the defender settles into a stance rather than jittering; far off it sprints.
  const pace = Math.min(1, d / 0.35) * (status === "chase" ? GUARD.chasePace : GUARD.pace);
  a.move = { x: (dx / d) * pace, z: (dz / d) * pace };
}
