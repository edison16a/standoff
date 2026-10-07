import { knockDown } from "./down";
import type { Match } from "./match";
import { TACKLE } from "./tuning";
import type { Athlete } from "./types";
import { fromYaw, norm2 } from "./vec";
import { endPlay } from "./whistle";

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
