import { statsOf } from "./body";
import { dodging } from "./juke";
import type { Match } from "./match";
import { endPlay } from "./whistle";
import { TACKLE } from "./tuning";
import type { Athlete } from "./types";
import { dir2, dist2, fromYaw, norm2 } from "./vec";

/** Puts a player on the ground for `dur` seconds; the last part of it is getting up. */
export function knockDown(a: Athlete, dur: number, cause: "tackled" | "missed" | "whiff" | "dive" | "tackler"): void {
  a.action = { kind: "down", t: 0, dur, cause };
  a.aim = null;
  a.guard = null;
}

/** Stronger tacklers reach a little farther. */
const reach = (a: Athlete) => TACKLE.range * (0.9 + statsOf(a).power * 0.02);

/**
 * A tackle press. Close enough to the ball carrier, the defender lunges
 * at where the carrier is going; too far, nothing happens.
 */
export function pressTackle(m: Match, a: Athlete, carrier: Athlete): boolean {
  if (a.tackleCd > 0 || a.role === "lineman") return false;
  if (a.action.kind !== "none") return false;
  if (dist2(a, carrier) > reach(a)) return false;
  const lead = { x: carrier.x + carrier.vx * 0.22, z: carrier.z + carrier.vz * 0.22 };
  const dir = dir2(a, lead);
  // A lunge is a burst on top of the run, so a chaser can still dive at a runner from behind.
  const speed = Math.max(TACKLE.lungeSpeed, Math.hypot(a.vx, a.vz) + 2.5);
  a.action = { kind: "lunge", t: 0, dur: TACKLE.lungeTime, dir, target: carrier.id };
  a.vx = dir.x * speed;
  a.vz = dir.z * speed;
  a.yaw = Math.atan2(dir.x, dir.z);
  a.tackleCd = TACKLE.cooldown;
  m.emit({ type: "lunge", id: a.id, target: carrier.id });
  return true;
}

/** Brings the carrier down: the play is over where they fall. */
export function tackle(m: Match, carrier: Athlete, by: Athlete): void {
  const sack = carrier.role === "qb" && carrier.team === m.offense && !m.play?.passed && !m.play?.crossed;
  knockDown(carrier, 1.5, "tackled");
  if (by.role !== "lineman") knockDown(by, 1.2, "tackler");
  by.stats.tackles++;
  if (sack) by.stats.sacks++;
  m.emit({ type: "tackle", id: carrier.id, by: by.id, sack });
  endPlay(m, sack ? "sack" : "tackle");
}

/** Turns a lunge toward the carrier, no faster than TACKLE.homing radians a second. */
function home(a: Athlete, carrier: Athlete, dt: number): void {
  const speed = Math.hypot(a.vx, a.vz);
  if (speed < 0.5) return;
  const now = Math.atan2(a.vx, a.vz);
  const want = Math.atan2(carrier.x - a.x, carrier.z - a.z);
  let d = want - now;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const turn = Math.max(-TACKLE.homing * dt, Math.min(TACKLE.homing * dt, d));
  a.vx = Math.sin(now + turn) * speed;
  a.vz = Math.cos(now + turn) * speed;
}

/**
 * Carries a lunge through. Reaching the carrier mid lunge tackles them,
 * unless they are in the middle of a juke, which leaves the tackler on
 * the ground for a while. A lunge at nothing ends on the ground too.
 */
export function updateLunge(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "lunge") return;
  act.t += dt;
  const k = Math.max(0, 1 - 1.2 * dt);
  a.vx *= k;
  a.vz *= k;
  const carrier = m.carrier();
  // Early in the lunge the arms still reach after a runner who keeps going, but not after a juke.
  if (carrier && carrier.team !== a.team && act.t < 0.25 && !dodging(carrier)) home(a, carrier, dt);
  if (m.phase === "live" && carrier && carrier.team !== a.team && act.t > 0.04 && dist2(a, carrier) < TACKLE.contact) {
    if (dodging(carrier)) {
      knockDown(a, TACKLE.missedDown, "missed");
      m.emit({ type: "missedTackle", id: carrier.id, by: a.id });
    } else {
      tackle(m, carrier, a);
    }
    return;
  }
  if (act.t >= act.dur) knockDown(a, TACKLE.whiffDown, "whiff");
}

/** A dive: a burst forward and onto the ground. A ball carrier who dives is down where they land. */
export function startDive(m: Match, a: Athlete): boolean {
  if (a.action.kind !== "none" && a.action.kind !== "juke") return false;
  const speed = Math.hypot(a.vx, a.vz);
  const stick = norm2(a.move);
  const dir = stick.x !== 0 || stick.z !== 0 ? stick : speed > 0.5 ? { x: a.vx / speed, z: a.vz / speed } : fromYaw(a.yaw);
  const burst = Math.max(TACKLE.diveSpeed, speed);
  a.action = { kind: "dive", t: 0, dur: TACKLE.diveTime, dir };
  a.vx = dir.x * burst;
  a.vz = dir.z * burst;
  a.yaw = Math.atan2(dir.x, dir.z);
  m.emit({ type: "dive", id: a.id });
  return true;
}

export function updateDive(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "dive") return;
  act.t += dt;
  // Airborne for the first half, then sliding on the turf.
  const k = Math.max(0, 1 - (act.t < act.dur * 0.5 ? 0.6 : 4.5) * dt);
  a.vx *= k;
  a.vz *= k;
  if (act.t < act.dur) return;
  knockDown(a, 0.8, "dive");
  if (m.carrier()?.id === a.id && m.phase === "live") endPlay(m, "dive");
}

/** Time on the ground runs out and the player is back on their feet. */
export function updateDown(a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "down") return;
  act.t += dt;
  if (act.t >= act.dur) a.action = { kind: "none" };
}
