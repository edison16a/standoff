import { airborne, charOf, standingReach } from "./athlete";
import { RIM_SPOT, rimDistance } from "./court";
import { chooseDunk } from "./dunk-style";
import type { Match } from "./match";
import { launchShot, slam } from "./shooting";
import { JUMP, RIM } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2, lerp, segmentDistance, yawOf, type V2 } from "./vec";

/**
 * Driving at the rim: a gather step, then off the floor into a layup or
 * a dunk. Strong players dunk; anyone dunks when nobody is near. A
 * defender in the way loses the contact battle if much weaker, and wins
 * it if much stronger, which turns the dunk into a layup.
 */
/**
 * Which way from the rim the finish happens. A player coming from under
 * the glass swings round to finish in front of it, so the body and the
 * ball never pass through the backboard.
 */
export function finishSide(a: V2, d = rimDistance(a)): V2 {
  const raw = d > 0.2 ? dir2(RIM_SPOT, a) : { x: 0, z: 1 };
  if (raw.z >= 0.45) return raw;
  const x = Math.abs(raw.x) < 0.05 ? 0.6 : raw.x;
  const l = Math.hypot(x, 0.45);
  return { x: x / l, z: 0.45 / l };
}

export function startDrive(m: Match, a: Athlete): void {
  const c = charOf(a);
  const d = rimDistance(a);
  const away = finishSide(a, d);
  const defenders = m.opponents(a.team);
  const open = defenders.every((o) => dist2(o, a) > 2);
  let dunk = (c.stats.strength >= 6 || open) && d > 0.7;
  const path = { from: { x: a.x, z: a.z }, to: RIM_SPOT };
  const inWay = defenders
    .filter((o) => !airborne(o) && segmentDistance(o, path.from, path.to).d < 0.9 && dist2(o, a) < 2.2)
    .sort((p, q) => dist2(p, a) - dist2(q, a))[0];
  if (inWay) {
    const edge = c.stats.strength - charOf(inWay).stats.strength;
    if (edge >= 2) {
      // Too much muscle: the defender is sent sprawling.
      const push = dir2(a, inWay);
      inWay.vx = push.x * 4;
      inWay.vz = push.z * 4;
      inWay.action = { kind: "stumble", t: 0, dur: 0.8 };
      m.emit({ type: "knockdown", id: inWay.id, by: a.id });
    } else if (edge <= -2) {
      dunk = false;
    }
  }
  const stop = dunk ? 0.42 : 0.72;
  const to = { x: RIM.x + away.x * stop, z: RIM.z + away.z * stop };
  const reach = standingReach(a);
  const peak = dunk ? clamp(RIM.y + 0.3 - reach, 0.5, 1.05) : clamp(RIM.y - 0.1 - reach, 0.35, 0.8);
  // The approach and the gather: a longer run in gives a longer last two steps before the leap.
  const gather = clamp((d - stop) / 9, 0.16, 0.3) + (dunk ? 0.04 : 0);
  const plan = dunk ? chooseDunk(m.rng, a, open) : null;
  const air = plan ? plan.air : 0.4;
  const rimHang = plan ? plan.rimHang : 0;
  // Down from the rim takes about as long as the way up, a touch less for a layup that never went as high.
  const fall = dunk ? 0.3 : 0.28;
  a.action = {
    kind: "drive", t: 0, dunk, style: plan?.style ?? null, from: { x: a.x, z: a.z }, to,
    takeoff: gather, finish: gather + air, rimHang, land: gather + air + rimHang + fall, peak, released: false,
  };
  a.yaw = yawOf(RIM.x - a.x, RIM.z - a.z);
  m.emit({ type: "gather", id: a.id, kind: dunk ? "dunk" : "layup" });
}

export function updateDrive(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "drive") return;
  const before = act.t;
  act.t += dt;
  const t = act.t;
  const u = clamp(t / act.finish, 0, 1);
  const eased = 1 - (1 - u) * (1 - u);
  a.x = lerp(act.from.x, act.to.x, eased);
  a.z = lerp(act.from.z, act.to.z, eased);
  a.vx = a.vz = 0;
  a.yaw = yawOf(RIM.x - a.x, RIM.z - a.z);
  // Up to the peak at the moment of the finish, a hang on the rim for those who do, then down.
  const hang = act.rimHang;
  const top = act.peak - (hang > 0 ? 0.08 : 0);
  if (t < act.takeoff) a.y = 0;
  else if (t < act.finish) {
    const s = (t - act.takeoff) / (act.finish - act.takeoff);
    a.y = act.peak * (1 - (1 - s) * (1 - s));
  } else if (t < act.finish + hang) a.y = act.peak - 0.08 * ((t - act.finish) / hang);
  else {
    const s = clamp((t - act.finish - hang) / Math.max(0.1, act.land - act.finish - hang), 0, 1);
    a.y = top * (1 - s * s);
  }
  if (before < act.takeoff && t >= act.takeoff) m.emit({ type: "takeoff", id: a.id, dunk: act.dunk });
  if (!act.released && t >= act.finish && m.ball.holder === a.id && m.phase === "live") {
    act.released = true;
    if (act.dunk) slam(m, a);
    else {
      const hand = { x: a.x + (RIM.x - a.x) * 0.25, y: a.y + standingReach(a) - 0.05, z: a.z + (RIM.z - a.z) * 0.25 };
      launchShot(m, a, "layup", "good", hand);
    }
  }
  if (t >= act.land) {
    a.y = 0;
    a.action = { kind: "none" };
    a.recover = act.dunk ? JUMP.driveRecover : JUMP.shotRecover;
    m.emit({ type: "land", id: a.id, hard: act.dunk });
  }
}
