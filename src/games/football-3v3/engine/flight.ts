import { BALL_SHAPE, LONG, longAxis, omegaOf } from "./physics/ball-shape";
import { integrate, SUB } from "./physics/integrate";
import { touchGoal, type GoalPart } from "./physics/posts";
import { qFromTo, type Quat } from "./physics/quat";
import { touchTurf } from "./physics/turf";
import { cross3, dot3, norm3, type V3 } from "./vec";

export { SUB };

/** How the ball left the hand or foot: a spiral about its long axis, or end over end. */
export type SpinStyle = "spiral" | "tumble";

/** Something the ball hit during a step. */
export interface FlightHit {
  kind: "turf" | GoalPart;
  impulse: number;
  /** Flight time of the hit. */
  t: number;
  side?: 1 | -1;
  point?: V3;
}

/**
 * A free ball as a rigid body: position, velocity, orientation and
 * angular momentum, stepped by the real physics in fixed sub steps,
 * bouncing off the turf, the posts and the net. `hits` lists what it
 * touched in the last step.
 */
export interface Flight {
  pos: V3;
  vel: V3;
  q: Quat;
  /** Angular momentum, world frame. */
  L: V3;
  style: SpinStyle;
  /** Seconds since launch. */
  t: number;
  /** Time handed in but not yet stepped, under one sub step. */
  carry: number;
  hits: FlightHit[];
  /** Has touched the turf, and how many real bounces it has made. */
  grounded: boolean;
  bounces: number;
  /** The last hard knock, for the drawing's squash. */
  knock: { t: number; n: V3; impulse: number } | null;
  /** The last time it hit the posts or the net, for them to shake. */
  goal: FlightHit | null;
}

const UP: V3 = { x: 0, y: 1, z: 0 };
/** Below this the turf only holds the ball up; above it the ball bounced. */
const BOUNCE = 0.2;

/** A unit vector across `v`, level where it can be. */
function across(v: V3): V3 {
  const c = cross3(v, UP);
  return Math.hypot(c.x, c.y, c.z) < 1e-6 ? { x: 0, y: 0, z: 1 } : norm3(c);
}

function fresh(pos: V3, vel: V3, q: Quat, L: V3, style: SpinStyle): Flight {
  return { pos: { ...pos }, vel: { ...vel }, q, L, style, t: 0, carry: 0, hits: [], grounded: false, bounces: 0, knock: null, goal: null };
}

/**
 * Puts a ball in the air. A spiral leaves with its nose along the throw,
 * spinning `spin` radians a second about its long axis; `wobble` is the
 * half angle of the cone its nose will circle (a nutation), from a hand
 * that was not quite behind the ball. A tumble leaves upright on the
 * tee, leaning back, turning end over end with the top going back.
 */
export function launch(pos: V3, vel: V3, style: SpinStyle, spin: number, wobble: number): Flight {
  const dir = norm3(vel);
  if (style === "spiral") {
    const q = qFromTo(LONG, dir);
    const side = across(dir);
    const Ls = BALL_SHAPE.iLong * spin;
    const tilt = Ls * Math.tan(wobble);
    return fresh(pos, vel, q, { x: dir.x * Ls + side.x * tilt, y: dir.y * Ls + side.y * tilt, z: dir.z * Ls + side.z * tilt }, style);
  }
  const flat = norm3({ x: dir.x, y: 0, z: dir.z });
  const side = across(flat);
  const lean = norm3({ x: UP.x - 0.3 * flat.x, y: 1, z: -0.3 * flat.z });
  const q = qFromTo(LONG, lean);
  const Lt = BALL_SHAPE.iCross * spin;
  const Ll = BALL_SHAPE.iLong * spin * wobble;
  return fresh(pos, vel, q, { x: side.x * Lt + lean.x * Ll, y: side.y * Lt + lean.y * Ll, z: side.z * Lt + lean.z * Ll }, style);
}

/** One sub step, with whatever the ball touches. */
function sub(f: Flight): void {
  integrate(f, SUB);
  f.t += SUB;
  const j = touchTurf(f, SUB);
  if (j > 0) {
    f.grounded = true;
    if (j > BOUNCE) {
      f.bounces++;
      f.hits.push({ kind: "turf", impulse: j, t: f.t });
      f.knock = { t: f.t, n: UP, impulse: j };
    }
  }
  const g = touchGoal(f);
  if (g) {
    const hit: FlightHit = { kind: g.part, impulse: g.impulse, t: f.t, side: g.side, point: g.point };
    f.hits.push(hit);
    f.goal = hit;
    f.knock = { t: f.t, n: norm3({ x: -g.side, y: 0, z: 0 }), impulse: g.impulse };
  }
}

/**
 * Steps the ball `dt` seconds in fixed sub steps, carrying any remainder
 * to the next call so the same inputs always fly the same way. `after`
 * runs after every sub step with where the ball was before it, and
 * stops the stepping when it returns true (a catch, say).
 */
export function stepFlight(f: Flight, dt: number, after?: (from: V3) => boolean): void {
  f.hits = [];
  f.carry += dt;
  while (f.carry >= SUB - 1e-9) {
    f.carry -= SUB;
    const from = { ...f.pos };
    sub(f);
    if (after?.(from)) {
      f.carry = 0;
      return;
    }
  }
}

/** A copy that can be stepped ahead without touching the real ball. */
export function cloneFlight(f: Flight): Flight {
  return { ...f, pos: { ...f.pos }, vel: { ...f.vel }, q: { ...f.q }, L: { ...f.L }, hits: [], knock: f.knock && { ...f.knock }, goal: f.goal && { ...f.goal } };
}

/** Where the ball will be after `time` seconds, stepped with the same physics. */
export function predict(f: Flight, time: number): Flight {
  const g = cloneFlight(f);
  stepFlight(g, time);
  return g;
}

/** The long axis now, as a unit vector. */
export const axisOf = (f: Flight): V3 => longAxis(f.q);

/** Spin about the long axis, radians a second. */
export const spinOf = (f: Flight): number => dot3(omegaOf(f.q, f.L), longAxis(f.q));

/** The angle between the long axis and the path, radians: near zero for a tight spiral. */
export function yawOf(f: Flight): number {
  const s = Math.hypot(f.vel.x, f.vel.y, f.vel.z);
  if (s < 1e-6) return 0;
  return Math.acos(Math.min(1, Math.abs(dot3(longAxis(f.q), f.vel)) / s));
}
