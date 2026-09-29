import { airborne, charOf, standingReach } from "./athlete";
import { RIM_SPOT, rimDistance } from "./court";
import { chooseDunk } from "./dunk-style";
import { finishSpot, layupKind, releaseHand } from "./finish";
import type { Match } from "./match";
import { launchShot, slam } from "./shooting";
import { JUMP, RIM } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2, lerp, segmentDistance, yawOf } from "./vec";

/**
 * Driving at the rim: the last two steps of the gather, then off the
 * floor into a layup or a dunk. Strong players dunk; anyone dunks when
 * nobody is near. A defender in the way loses the contact battle if
 * much weaker, and wins it if much stronger, which turns the dunk into
 * a layup through the contact. Under the rim it becomes a reverse.
 */
export function startDrive(m: Match, a: Athlete): void {
  const c = charOf(a);
  const d = rimDistance(a);
  const defenders = m.opponents(a.team);
  const open = defenders.every((o) => dist2(o, a) > 2);
  let dunk = (c.stats.strength >= 6 || open) && d > 0.7;
  const path = { from: { x: a.x, z: a.z }, to: RIM_SPOT };
  const inWay = defenders
    .filter((o) => !airborne(o) && segmentDistance(o, path.from, path.to).d < 0.9 && dist2(o, a) < 2.2)
    .sort((p, q) => dist2(p, a) - dist2(q, a))[0];
  let contact: Athlete | null = null;
  if (inWay) {
    const edge = c.stats.strength - charOf(inWay).stats.strength;
    if (edge >= 2) {
      // Too much muscle: the defender is sent sprawling.
      const push = dir2(a, inWay);
      inWay.vx = push.x * 4;
      inWay.vz = push.z * 4;
      inWay.action = { kind: "stumble", t: 0, dur: 0.8 };
      m.emit({ type: "knockdown", id: inWay.id, by: a.id });
    } else {
      // An even or a losing battle: into his body and up, a layup through the contact.
      if (edge <= -2) dunk = false;
      contact = inWay;
    }
  }
  const layup = dunk ? null : layupKind(a, contact !== null && dist2(contact, a) < 1.6);
  const to = finishSpot(a, dunk, layup);
  const reach = standingReach(a);
  const peak = dunk ? clamp(RIM.y + 0.3 - reach, 0.5, 1.05) : clamp(RIM.y - 0.1 - reach, 0.35, 0.8) * (layup === "contact" ? 0.85 : 1);
  // The last two steps: a longer run in makes for a longer gather, and a dunk loads up a touch longer.
  const gather = clamp((d - dist2(to, RIM_SPOT)) / 7, 0.3, 0.42) + (dunk ? 0.05 : 0);
  const plan = dunk ? chooseDunk(m.rng, a, open, m.forcedDunk) : null;
  m.forcedDunk = null;
  const air = plan ? plan.air : layup === "reverse" ? 0.46 : 0.4;
  const rimHang = plan ? plan.rimHang : 0;
  // Down from the rim takes about as long as the way up, a touch less for a layup that never went as high.
  const fall = dunk ? 0.32 : 0.28;
  a.action = {
    kind: "drive", t: 0, dunk, style: plan?.style ?? null, layup, from: { x: a.x, z: a.z }, to,
    takeoff: gather, finish: gather + air, rimHang, land: gather + air + rimHang + fall, peak, released: false,
  };
  a.yaw = driveYaw(a);
  if (contact) {
    const power = clamp(0.4 + (charOf(contact).stats.strength - c.stats.strength) * 0.08, 0.3, 0.9);
    m.emit({ type: "bump", a: a.id, b: contact.id, power });
  }
  m.emit({ type: "gather", id: a.id, kind: dunk ? "dunk" : "layup" });
}

/** A reverse is laid in with the back to the rim, going along the baseline; everything else faces the rim. */
function driveYaw(a: Athlete): number {
  const act = a.action;
  if (act.kind === "drive" && act.layup === "reverse") return yawOf(act.to.x - act.from.x, act.to.z - act.from.z);
  return yawOf(RIM.x - a.x, RIM.z - a.z);
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
  if (act.layup !== "reverse" || t < act.finish) a.yaw = driveYaw(a);
  a.y = driveHeight(act, t);
  if (before < act.takeoff && t >= act.takeoff) m.emit({ type: "takeoff", id: a.id, dunk: act.dunk });
  if (!act.released && t >= act.finish && m.ball.holder === a.id && m.phase === "live") {
    act.released = true;
    if (act.dunk) slam(m, a);
    else launchShot(m, a, "layup", "good", releaseHand(a, act.layup ?? "finger"));
  }
  if (t >= act.land) {
    a.y = 0;
    a.action = { kind: "none" };
    a.recover = act.dunk ? JUMP.driveRecover : JUMP.shotRecover;
    m.emit({ type: "land", id: a.id, hard: act.dunk });
  }
}

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/**
 * Feet off the floor through a drive: up to the peak at the finish, then
 * for a dunk that hangs, a drop of a hand's length as the arms take the
 * weight on the rim, a hold, and the fall to the floor.
 */
export function driveHeight(act: Drive, t: number): number {
  const hang = act.rimHang;
  const onRim = act.peak - 0.24;
  if (t < act.takeoff) return 0;
  if (t < act.finish) {
    const s = (t - act.takeoff) / (act.finish - act.takeoff);
    return act.peak * (1 - (1 - s) * (1 - s));
  }
  if (t < act.finish + hang) {
    const s = clamp(((t - act.finish) / hang) * 4, 0, 1);
    return lerp(act.peak, onRim, s * s * (3 - 2 * s));
  }
  const from = hang > 0 ? onRim : act.peak;
  const s = clamp((t - act.finish - hang) / Math.max(0.1, act.land - act.finish - hang), 0, 1);
  return from * (1 - s * s);
}
