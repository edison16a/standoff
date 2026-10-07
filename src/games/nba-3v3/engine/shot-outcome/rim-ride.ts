import type { BallBody } from "../physics/air";
import { BALL } from "../physics/ball-spec";
import type { Contact } from "../physics/world";
import { BOARD, RIM } from "../tuning";
import { clamp, lerp, type V3 } from "../vec";

/**
 * The toilet bowl: a ball that lands soft on the ring and rolls round it
 * before it falls in or off. The free physics almost never holds a ball
 * on a thin tube for a whole lap, so this one part is authored: from the
 * first touch the ball is carried along the top of the tube, a little
 * hop off the landing, a wobble, slowing as it goes, then tipped over
 * the inside or the outside edge. It is handed back to the physics on
 * the tube with the speed it had, so the drop through the net or off the
 * iron is real.
 */

export interface RideSpec {
  /** Turns round the ring before it tips. */
  laps: number;
  drop: "in" | "out";
}

export interface RideState {
  spec: RideSpec;
  t: number;
  dur: number;
  /** Angle round the ring at the touch, and which way it rolls. */
  a0: number;
  dir: 1 | -1;
  /** Angular speed at the touch and at the tip, radians a second. */
  w0: number;
  w1: number;
  /** Where across the tube it landed: negative inside the ring. */
  u0: number;
  /** How high it hops off the landing, and for how long. */
  hop: number;
  hopT: number;
  /** Seconds to the next soft tick of the iron, for the sound. */
  tick: number;
}

/** The ball's centre rests this far from the middle of the tube. */
const TOUCH = BALL.radius + RIM.tube;
/** It rolls off the touch at least this fast round the ring, at most this fast, and slows to this share by the tip. */
const W_MIN = 7;
const W_MAX = 15;
const SLOW = 0.45;
/** Never longer than this: a roll that would go on and on is cut to fewer laps. */
const MAX_DUR = 1.35;
/** It rides just inside the top of the tube, and tips this far across it at the end. */
const U_RIDE = -0.03;
const U_TIP = 0.085;
const TICK = 0.16;

/** Starts a ride from a touch on top of the ring, or null when the touch is from below or the side. */
export function startRide(spec: RideSpec, b: BallBody): RideState | null {
  const hx = b.pos.x - RIM.x;
  const hz = b.pos.z - RIM.z;
  if (b.pos.y < RIM.y + 0.03) return null;
  const a0 = Math.atan2(hz, hx);
  // Roll on the way it was already moving round the ring, so the touch flows into the ride.
  const along = -b.vel.x * Math.sin(a0) + b.vel.z * Math.cos(a0);
  // The speed it brings round the ring carries on; the drop onto the iron becomes a little hop.
  const w0 = clamp(Math.abs(along) / RIM.radius, W_MIN, W_MAX);
  const w1 = w0 * SLOW;
  const laps = Math.min(spec.laps, ((w0 + w1) / 2) * MAX_DUR / (Math.PI * 2));
  const hop = clamp(Math.max(0, -b.vel.y) * 0.012, 0.02, 0.08);
  return {
    spec: { ...spec, laps },
    t: 0,
    dur: (Math.PI * 4 * laps) / (w0 + w1),
    a0,
    dir: along >= 0 ? 1 : -1,
    w0,
    w1,
    u0: clamp(Math.hypot(hx, hz) - RIM.radius, -TOUCH * 0.9, TOUCH * 0.9),
    hop,
    hopT: 2 * Math.sqrt((2 * hop) / BALL.gravity),
    tick: TICK,
  };
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Where the ride has the ball `t` seconds in. */
export function ridePoint(r: RideState, t: number, out: V3 = { x: 0, y: 0, z: 0 }): V3 {
  const s = clamp(t / r.dur, 0, 1);
  // Slows evenly as friction on the iron bleeds it, but still rolls as it tips.
  const a = r.a0 + r.dir * (r.w0 * t - ((r.w0 - r.w1) * t * t) / (2 * r.dur));
  const settle = smooth(Math.min(1, t / Math.max(0.2, r.hopT)));
  const tip = smooth(clamp((s - 0.72) / 0.28, 0, 1));
  const wobble = 0.012 * Math.sin(Math.PI * 6 * s) * (1 - s);
  const want = lerp(lerp(r.u0, U_RIDE + wobble, settle), r.spec.drop === "in" ? -U_TIP : U_TIP, tip);
  // The back of the ring is a hand from the glass: out there the ball rides against the glass, never into it.
  const back = -Math.sin(a);
  const u = back > 0 ? Math.min(want, (RIM.z - BOARD.face - BALL.radius) / back - RIM.radius) : want;
  // A falling arc off the landing, as a real bounce.
  const k = t / r.hopT;
  const hop = k < 1 ? 4 * r.hop * k * (1 - k) : 0;
  const ring = RIM.radius + u;
  out.x = RIM.x + Math.cos(a) * ring;
  out.y = RIM.y + Math.sqrt(Math.max(0, TOUCH * TOUCH - u * u)) + hop;
  out.z = RIM.z + Math.sin(a) * ring;
  return out;
}

const next: V3 = { x: 0, y: 0, z: 0 };

/** Moves the ball one small step along the ride. Returns false once it has tipped and the physics has it back. */
export function stepRide(r: RideState, b: BallBody, h: number, out: Contact[]): boolean {
  r.t = Math.min(r.dur, r.t + h);
  ridePoint(r, r.t, next);
  const { pos, vel } = b;
  vel.x = (next.x - pos.x) / h;
  vel.y = (next.y - pos.y) / h;
  vel.z = (next.z - pos.z) / h;
  pos.x = next.x;
  pos.y = next.y;
  pos.z = next.z;
  rollOnTube(b);
  r.tick -= h;
  if (r.tick <= 0) {
    r.tick = TICK;
    out.push({ kind: "rim", power: 0.45, at: { x: pos.x, y: RIM.y, z: pos.z } });
  }
  if (r.t < r.dur) return true;
  // Over the edge: a nudge the way it tips, and gravity does the rest.
  const hx = pos.x - RIM.x;
  const hz = pos.z - RIM.z;
  const hl = Math.hypot(hx, hz) || 1;
  const push = r.spec.drop === "in" ? -0.45 : 0.45;
  vel.x += (hx / hl) * push;
  vel.z += (hz / hl) * push;
  vel.y -= 0.2;
  return false;
}

/** The spin of a ball rolling on the tube without slipping: the skin at the touch stands still. */
function rollOnTube(b: BallBody): void {
  const { pos, vel, w } = b;
  const hx = pos.x - RIM.x;
  const hz = pos.z - RIM.z;
  const hl = Math.hypot(hx, hz) || 1;
  const nx = pos.x - (RIM.x + (hx / hl) * RIM.radius);
  const ny = pos.y - RIM.y;
  const nz = pos.z - (RIM.z + (hz / hl) * RIM.radius);
  const nl = Math.hypot(nx, ny, nz) || 1;
  const r = BALL.radius * nl;
  w.x = (ny * vel.z - nz * vel.y) / r;
  w.y = (nz * vel.x - nx * vel.z) / r;
  w.z = (nx * vel.y - ny * vel.x) / r;
}
