import { LOOSE } from "../block-preset";
import { knockDown } from "../down";
import { resolveHit } from "../hit";
import { dodging } from "../juke";
import type { Match } from "../match";
import { tackle } from "../tackle";
import { LINE, TACKLE } from "../tuning";
import type { Athlete } from "../types";
import { dir2, dist2 } from "../vec";
import { CLINCH } from "./clinch-pick";

/** Speed a defender bursts free with on a shed, metres a second. */
const RIP = 3.2;
/** Seconds a finished pancake or shed keeps playing on the two men before they run as normal. */
const AFTER = 1.4;

/**
 * Ends a block with the move that beat it. A pancake puts the defender
 * on his back with the blocker stood over him; a shed has the defender
 * rip free toward the ball while the beaten blocker stumbles. Either way
 * neither can be blocked again for a moment.
 */
export function breakClinch(m: Match, o: Athlete, d: Athlete, kind: "pancake" | "shed"): void {
  m.emit({ type: "pads", a: o.id, b: d.id, power: kind === "pancake" ? 1 : 0.7 });
  o.block = { kind, t: 0, offense: true };
  d.block = { kind, t: 0, offense: false };
  m.support.rest.set(o.id, m.time + CLINCH.rest);
  if (kind === "pancake") {
    knockDown(d, LOOSE.pancakeDown, "pancaked");
    const back = dir2(o, d);
    d.vx = back.x * 1.5;
    d.vz = back.z * 1.5;
    o.vx = o.vz = 0;
    return;
  }
  m.support.rest.set(d.id, m.time + CLINCH.free);
  const c = m.carrier();
  const past = dir2(d, c && c.team !== d.team ? c : { x: d.x + (d.x - o.x), z: d.z + (d.z - o.z) });
  d.vx = past.x * RIP;
  d.vz = past.z * RIP;
  d.yaw = Math.atan2(past.x, past.z);
  const across = past.x * Math.cos(o.yaw) - past.z * Math.sin(o.yaw);
  o.stumble = { t: 0, dur: LOOSE.beaten, side: across >= 0 ? 1 : -1 };
  o.stagger = Math.max(o.stagger, LOOSE.beaten);
}

/** The pancake or shed plays out on its own clock after the block ends, then the men run as normal. */
export function ageLooseBlocks(m: Match, dt: number): void {
  for (const a of m.athletes) {
    if (a.role === "lineman" || !a.block || m.support.clinches.some((c) => c.o === a.id || c.d === a.id)) continue;
    a.block.t += dt;
    if (a.block.t > AFTER || (a.block.kind !== "pancake" && a.block.kind !== "shed")) a.block = null;
  }
}

/**
 * A blocked defender reaches out for a carrier going right past him: he
 * only sometimes gets a hand free, and then it is an arm tackle, as a
 * lineman's grab out of his block is (linemen.ts).
 */
export function reachOut(m: Match, d: Athlete, carrier: Athlete): void {
  if (m.phase !== "live" || d.tackleCd > 0 || dist2(d, carrier) > 1.1) return;
  d.tackleCd = 1;
  if (dodging(carrier) || !m.support.rng.chance(TACKLE.linemanGrab)) return;
  const hit = resolveHit(d, carrier, m.support.rng, LINE.grabWrap);
  if (hit.down) tackle(m, carrier, d, "shoestring", hit.n);
  else carrier.stagger = Math.max(carrier.stagger, 0.25);
}
