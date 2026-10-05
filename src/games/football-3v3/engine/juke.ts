import { statsOf } from "./body";
import { jukeRecovery } from "./build-effects";
import type { MatchEvent } from "./events";
import { JUKE } from "./tuning";
import type { Athlete, JukeKind } from "./types";
import { fromYaw, norm2, type V2 } from "./vec";

/** Which juke the stick asks for against the way the player is heading. */
export function jukeFor(heading: V2, stick: V2): { juke: JukeKind; side: 1 | -1 } {
  const l = Math.hypot(stick.x, stick.z);
  if (l < 0.3) return { juke: "spin", side: 1 };
  const cos = (heading.x * stick.x + heading.z * stick.z) / l;
  // Positive cross means the stick points to the player's left.
  const side: 1 | -1 = heading.x * stick.z - heading.z * stick.x >= 0 ? 1 : -1;
  if (cos > 0.64) return { juke: "spin", side };
  if (cos < -0.57) return { juke: "back", side };
  return { juke: "side", side };
}

/** How much spamming has slowed the jukes down: 1 fresh, more when hot. */
export const jukeSlow = (a: Athlete) => 1 + 0.3 * Math.max(0, a.jukeHeat - JUKE.heatFree);

export function canJuke(a: Athlete): boolean {
  return a.role !== "lineman" && a.jukeCd <= 0 && a.action.kind === "none";
}

/** How hard a planted foot can push the body: well past a running stride, more for agile players. */
const plantGrip = (a: Athlete) => JUKE.grip + (statsOf(a).agility - 5) * JUKE.gripPerAgility;

/**
 * Starts a juke: a 360 spin, a back move or a side step. The runner
 * plants a foot and pushes off it toward the new line (the push is as
 * hard as the cleats hold), then runs out of it. Each one slows the
 * runner, and each one in quick succession comes out slower and leaves
 * the legs heavier, so spamming the button does not pay.
 */
export function startJuke(a: Athlete, emit: (e: MatchEvent) => void): boolean {
  if (!canJuke(a)) return false;
  const speed = Math.hypot(a.vx, a.vz);
  const heading = speed > 0.8 ? { x: a.vx / speed, z: a.vz / speed } : fromYaw(a.yaw);
  const { juke, side } = jukeFor(heading, a.move);
  const spec = JUKE[juke];
  const slow = jukeSlow(a);
  // Left of the heading, for the sideways push toward the stick.
  const left = { x: -heading.z * side, z: heading.x * side };
  const hop = juke === "side" ? JUKE.hop : juke === "back" ? JUKE.hop * 0.8 : 0;
  const push = { x: heading.x * speed * spec.speed + left.x * hop, z: heading.z * speed * spec.speed + left.z * hop };
  a.action = {
    kind: "juke", t: 0, dur: spec.dur * slow, juke, side, dir: heading,
    speed: (speed * spec.speed) / slow, push, plant: spec.plant * slow,
    dodge: [spec.dodge[0] * slow, spec.dodge[1] * slow],
  };
  a.jukeCd = JUKE.cooldown * slow * jukeRecovery(statsOf(a));
  a.jukeHeat += JUKE.heatPerJuke;
  emit({ type: "juke", id: a.id, juke });
  return true;
}

/** Drives the velocity toward a target as hard as `grip` allows this step. */
function pushToward(a: Athlete, want: V2, grip: number, dt: number): void {
  const dx = want.x - a.vx;
  const dz = want.z - a.vz;
  const d = Math.hypot(dx, dz);
  const k = d < 1e-6 ? 0 : Math.min(d, grip * dt) / d;
  a.vx += dx * k;
  a.vz += dz * k;
  a.ax = (dx * k) / dt;
  a.az = (dz * k) / dt;
}

/** Carries a juke along: the push off the planted foot, then running out of it, and the juke ends on time. */
export function updateJuke(a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "juke") return;
  act.t += dt;
  if (act.t < act.plant) pushToward(a, act.push, plantGrip(a), dt);
  else {
    // Out of the plant the stride bends back into the run.
    const want = { x: act.dir.x * act.speed, z: act.dir.z * act.speed };
    const settle = act.juke === "spin" ? 5 : 7;
    pushToward(a, want, Math.hypot(want.x - a.vx, want.z - a.vz) * settle, dt);
  }
  if (act.juke === "spin") a.yaw += ((Math.PI * 2 * dt) / act.dur) * act.side;
  if (act.t >= act.dur) {
    a.action = { kind: "none" };
    const d = norm2({ x: a.vx, z: a.vz });
    if (d.x !== 0 || d.z !== 0) a.yaw = Math.atan2(d.x, d.z);
  }
}

/** True while the juke makes a tackle miss. */
export function dodging(a: Athlete): boolean {
  const act = a.action;
  return act.kind === "juke" && act.t >= act.dodge[0] && act.t <= act.dodge[1];
}
