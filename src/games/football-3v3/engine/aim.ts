import { isDown } from "./athlete";
import { FIELD } from "./field";
import { THROW } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { add, clamp, cross, dist, dot, len, norm, segDist, sub, v3, type Vec2, type Vec3 } from "./vec";

/** Receivers the quarterback can throw to: team mates on their feet. */
export function receivers(state: MatchState, qb: Athlete): Athlete[] {
  return state.athletes.filter((a) => a.team === qb.team && a.id !== qb.id && !isDown(a));
}

/**
 * The receiver the throw stick picks: the throw stick draws an invisible
 * line out from the quarterback, and the receiver nearest that line,
 * somewhere in front along it, lights up. Null when nobody is near it.
 */
export function pickTarget(state: MatchState, qb: Athlete, aim: Vec2): number | null {
  if (len(aim) < THROW.deadzone) return null;
  const dir = norm(aim);
  let best: Athlete | null = null;
  let bestOff = Infinity;
  for (const r of receivers(state, qb)) {
    // Where they will be a moment from now, so a receiver breaking across the line counts.
    const rel = sub(add(r.pos, r.vel, 0.3), qb.pos);
    const along = dot(rel, dir);
    if (along <= 0) continue;
    const off = Math.abs(cross(dir, rel));
    if (Math.atan2(off, along) > THROW.cone) continue;
    if (off < bestOff) {
      bestOff = off;
      best = r;
    }
  }
  return best?.id ?? null;
}

/** Launch speed for flight timing: a stronger arm throws a flatter, faster ball. */
export function armSpeed(arm: number): number {
  return THROW.slowArm + (THROW.fastArm - THROW.slowArm) * arm;
}

/** How long a throw of this length hangs: a dart short, arcing over coverage long. */
export function flightTime(distance: number, arm: number): number {
  const loft = THROW.loft * Math.max(0, distance - 10) ** 1.5 / 10;
  return clamp(distance / armSpeed(arm) + loft, THROW.minFlight, THROW.maxFlight);
}

/** The quarterback's hand at release, high over the shoulder. */
export function releasePoint(qb: Athlete): Vec3 {
  return v3(qb.pos.x, 2.05, qb.pos.z);
}

/**
 * Where to put the ball so the receiver runs onto it: the receiver's
 * spot after the flight, flight time depending on that distance, solved
 * by a few rounds of fixed point. Kept inside the field.
 */
export function leadTarget(qb: Athlete, r: Athlete): { at: Vec3; eta: number } {
  let spot: Vec2 = { ...r.pos };
  let eta = 0;
  for (let i = 0; i < 5; i++) {
    eta = flightTime(dist(qb.pos, spot), qb.arm);
    spot = add(r.pos, r.vel, eta);
    spot.z = clamp(spot.z, -FIELD.halfWidth + 0.8, FIELD.halfWidth - 0.8);
    spot.x = clamp(spot.x, -FIELD.endLine + 0.8, FIELD.endLine - 0.8);
  }
  return { at: v3(spot.x, THROW.chest, spot.z), eta };
}

/**
 * A defender standing in front of the target takes the ball whatever
 * happens: near the catch point, on the quarterback's side of it and
 * close to the line of the throw. Players on Guard never do.
 */
export function autoPicker(state: MatchState, qb: Athlete, catchAt: Vec2): Athlete | null {
  let best: Athlete | null = null;
  for (const d of state.athletes) {
    if (d.team === qb.team || isDown(d) || d.guard.held) continue;
    const toD = sub(d.pos, catchAt);
    if (len(toD) > THROW.pickZone || dot(toD, sub(qb.pos, catchAt)) <= 0) continue;
    if (segDist(d.pos, qb.pos, catchAt) > THROW.pickLine) continue;
    if (!best || dist(d.pos, catchAt) < dist(best.pos, catchAt)) best = d;
  }
  return best;
}
