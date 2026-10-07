import type { DunkStyle } from "../../roster";
import { airborne, buildOf, standingReach, topSpeed } from "../athlete";
import { RIM_SPOT, rimDistance } from "../court";
import type { Match } from "../match";
import { RIM } from "../tuning";
import type { Athlete } from "../types";
import { dir2, dist2, segmentDistance } from "../vec";
import { canDunk } from "./plan";

/**
 * How a drive arrives at the rim, read off the court the moment the
 * gather starts: the angle, the speed, the natural finishing hand, who
 * is near and where, and whether this is a putback or an alley oop.
 * The selection (`select.ts`) reads only this, so it can be tested on
 * its own.
 */

/** Straight down the lane, in from the wing, or along the baseline. */
export type Angle = "front" | "side" | "baseline";

/**
 * Where the nearest defender that matters is: on the way to the rim,
 * waiting at it, beside the driver on the ball side or the other side,
 * or chasing from behind.
 */
export type Spot = "path" | "rim" | "ballSide" | "offSide" | "trail";

export interface Threat {
  id: number;
  dist: number;
  spot: Spot;
  /** Which side of the driver's line he is on: + the driver's right. */
  lateral: number;
  /** A long armed shot blocker. */
  tall: boolean;
  /** Already in the air. */
  up: boolean;
  /** Driver's strength minus his. */
  edge: number;
}

export interface Approach {
  angle: Angle;
  speed: number;
  /** Near flat out for this player. */
  fast: boolean;
  distance: number;
  /** The natural finishing hand: the side of the rim the drive is on. */
  hand: 1 | -1;
  threat: Threat | null;
  /** Nobody within the open radius and nobody waiting at the rim. */
  open: boolean;
  canDunk: boolean;
  /** Just took an offensive board under the rim. */
  putback: boolean;
  /** Just caught a lob on the way to the rim. */
  alley: boolean;
  /** Speed and strength ratings, 1 to 10. */
  bounce: number;
  strength: number;
  signature: DunkStyle;
}

/** A defender this close, or one waiting at the rim, means no dunk unless the driver can go through him. */
export const OPEN_RADIUS = 1.8;
const AT_RIM = 1.3;

export function readApproach(m: Match, a: Athlete): Approach {
  const c = buildOf(a);
  const distance = rimDistance(a);
  const speed = Math.hypot(a.vx, a.vz);
  const off = a.x - RIM.x;
  const depth = a.z - RIM.z;
  const along = Math.abs(a.vx) > 1.4 && Math.abs(a.vx) > Math.abs(a.vz) * 1.2;
  const angle: Angle = depth < 0.9 || (depth < 1.8 && along) ? "baseline" : Math.abs(off) > depth * 0.6 ? "side" : "front";
  // Facing the rim from the front the driver's right is +x: the right side of the rim is laid in with the right hand.
  const hand: 1 | -1 = Math.abs(off) > 0.35 ? (off > 0 ? 1 : -1) : a.dribbleHand === -1 ? -1 : 1;
  const threat = readThreat(m, a, hand);
  const crowd = m.opponents(a.team).some((o) => dist2(o, a) < OPEN_RADIUS || (dist2(o, RIM_SPOT) < AT_RIM && segmentDistance(o, a, RIM_SPOT).t > 0.4));
  const board = m.lastBoard;
  const pass = m.alleyCatch;
  return {
    angle, speed, fast: speed > Math.min(4.6, topSpeed(a, true) * 0.85), distance, hand, threat,
    open: !crowd, canDunk: distance > 0.7 && canDunk(a),
    putback: !!board && board.id === a.id && board.offensive && m.time - board.at < 1.2 && distance < 2.4,
    alley: !!pass && pass.id === a.id && m.time - pass.at < 0.5,
    bounce: c.stats.speed, strength: c.stats.strength, signature: c.dunk,
  };
}

/** The defender that most shapes the finish: the closest, with one in the way or at the rim counting double. */
function readThreat(m: Match, a: Athlete, hand: number): Threat | null {
  const to = dir2(a, RIM_SPOT);
  const s = buildOf(a).stats;
  let best: Threat | null = null;
  let bestScore = Infinity;
  for (const o of m.opponents(a.team)) {
    const dist = dist2(o, a);
    if (dist > 3.2) continue;
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const ahead = rx * to.x + rz * to.z;
    // The driver's right, facing the rim, is (-to.z, to.x).
    const lateral = -rx * to.z + rz * to.x;
    const seg = segmentDistance(o, a, RIM_SPOT);
    let spot: Spot;
    if (ahead < -0.25) spot = "trail";
    else if (dist2(o, RIM_SPOT) < AT_RIM && seg.t > 0.5) spot = "rim";
    else if (seg.d < 0.75) spot = "path";
    else spot = Math.sign(lateral) === hand ? "ballSide" : "offSide";
    const weight = spot === "path" || spot === "rim" ? 0.5 : spot === "trail" ? 1.3 : 1;
    if (dist * weight >= bestScore) continue;
    bestScore = dist * weight;
    best = { id: o.id, dist, spot, lateral, tall: standingReach(o) > 2.6, up: airborne(o), edge: s.strength - buildOf(o).stats.strength };
  }
  return best;
}
