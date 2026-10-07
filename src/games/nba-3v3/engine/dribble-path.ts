import { buildOf, topSpeed } from "./athlete";
import { BALL } from "./physics/ball-spec";
import { bounceDrop } from "./physics/bounce-solve";
import type { Athlete } from "./types";
import type { V3 } from "./vec";

/**
 * Where the dribbling hand takes the ball and lets it go, and the push
 * that sends it to the floor and back up to the hand. The hand works
 * the ball where the blended dribble preset says: out to the side and
 * a little ahead, low and tight on a sprint, shielded when pressed.
 */

/** Phases of the dribble clock: the hand takes the ball at CATCH and lets it go at RELEASE, wrapping through 0. */
export const CATCH = 0.86;
export const RELEASE = 0.12;

/** True while the ball is in the hand on the dribble clock. */
export const inContact = (phase: number) => phase >= CATCH || phase < RELEASE;

/** Seconds from `phase` on to `to`, wrapping round, at `rate` bounces a second. */
export function phaseGap(phase: number, to: number, rate: number): number {
  const gap = (((to - phase) % 1) + 1) % 1;
  return gap / Math.max(0.2, rate);
}

/**
 * Where the ball's centre sits under the dribbling palm, `ahead`
 * seconds from now, with the ball on `side` (-1 left to 1 right). The
 * spot comes from the blended dribble preset (`dribble-style.ts`); a
 * hesitation stands it up, a behind the back takes it round the hips,
 * and between the legs sends it under the body from foot to foot.
 */
export function handSpot(a: Athlete, side: number, ahead: number): V3 {
  const h = buildOf(a).body.height;
  const fx = Math.sin(a.yaw);
  const fz = Math.cos(a.yaw);
  const style = a.dribbleStyle;
  const act = a.action;
  const tall = act.kind === "move" && act.move === "hesitation" && act.t < 0.26;
  const palm = h * (tall ? 0.5 : style.palm);
  let fwd = style.fwd;
  let out = style.out * side;
  const crossing = act.kind === "move" && a.crossArmed && Math.sign(side) !== a.dribbleHand;
  // Behind the back the ball goes round behind the hips on its way across.
  if (crossing && act.move === "behindBack") fwd = -0.22;
  // Between the legs it is bounced under the hips, between the split feet.
  if (crossing && act.move === "betweenLegs") {
    fwd = 0.05;
    out *= 0.25;
  }
  const { x, z } = whereAhead(a, ahead);
  return { x: x + fx * fwd - fz * out + a.vx * 0.05, y: palm - 0.1, z: z + fz * fwd + fx * out + a.vz * 0.05 };
}

/** How fast the run eases toward what the stick asks, in seconds. */
const EASE = 0.4;

/**
 * Where the player will be `ahead` seconds from now: carried on by the
 * run, and easing toward the speed the stick asks for, so the push
 * leads a player who is getting going and waits for one pulling up.
 */
function whereAhead(a: Athlete, ahead: number): { x: number; z: number } {
  const moving = a.action.kind === "none" || a.action.kind === "pass";
  const top = moving ? topSpeed(a, true) : 0;
  const dvx = moving ? a.move.x * top - a.vx : 0;
  const dvz = moving ? a.move.z * top - a.vz : 0;
  const k = ahead - EASE * (1 - Math.exp(-ahead / EASE));
  return { x: a.x + a.vx * ahead + dvx * k, z: a.z + a.vz * ahead + dvz * k };
}

/** The push off the hand at `from` that bounces once and rises to `to` after `time` seconds, with the roll that keeps it from skidding. */
export function releaseVelocity(from: V3, to: V3, time: number): { vel: V3; spin: V3 } {
  const t = Math.max(0.12, time);
  const down = bounceDrop(from.y, to.y, t);
  const vx = (to.x - from.x) / t;
  const vz = (to.z - from.z) / t;
  // Pushed from above and behind the ball, the fingers roll it forward: the skin meets the floor without sliding, so the run carries on through the bounce.
  return { vel: { x: vx, y: -down, z: vz }, spin: { x: vz / BALL.radius, y: 0, z: -vx / BALL.radius } };
}

/**
 * One step of the hand carrying the ball from where it is now toward
 * where it lets go: a cubic that starts with the ball's own velocity and
 * ends at the release with the push, `left` seconds from now.
 */
export function carryStep(pos: V3, vel: V3, end: V3, endVel: V3, left: number, dt: number): { pos: V3; vel: V3 } {
  if (left <= dt) return { pos: { ...end }, vel: { ...endVel } };
  const s = dt / left;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  const d00 = (6 * s * s - 6 * s) / left;
  const d10 = 3 * s * s - 4 * s + 1;
  const d01 = (-6 * s * s + 6 * s) / left;
  const d11 = 3 * s * s - 2 * s;
  const at = (k: "x" | "y" | "z") => h00 * pos[k] + h10 * left * vel[k] + h01 * end[k] + h11 * left * endVel[k];
  const rate = (k: "x" | "y" | "z") => d00 * pos[k] + d10 * vel[k] + d01 * end[k] + d11 * endVel[k];
  return { pos: { x: at("x"), y: at("y"), z: at("z") }, vel: { x: rate("x"), y: rate("y"), z: rate("z") } };
}
