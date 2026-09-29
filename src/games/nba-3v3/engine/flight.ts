import { GRAVITY, RIM } from "./tuning";
import type { V3 } from "./vec";

/**
 * A ball in scripted flight: a chain of short pieces (free arcs through
 * the air, and runs around the rim) worked out the moment the ball
 * leaves a hand. The outcome is already decided, so the path is drawn to
 * match it: contact with the rim or the glass happens exactly where the
 * outcome says, and each contact fires an event for the sound and the
 * net. When the chain ends the ball is loose and real physics takes over.
 */

export type FlightEvent =
  | { kind: "rim"; power: number }
  | { kind: "board"; power: number }
  | { kind: "net"; swish: boolean }
  | { kind: "score" }
  | { kind: "block" };

/** A free arc under gravity from `p` with starting velocity `v`. */
export interface ArcSeg {
  type: "arc";
  dur: number;
  p: V3;
  v: V3;
  /** Gravity scale, below 1 while the net drags on the ball. */
  g: number;
  events: FlightEvent[];
}

/** A run around the rim: the angle sweeps from a0 to a1, easing off, while the radius and height drift. */
export interface OrbitSeg {
  type: "orbit";
  dur: number;
  a0: number;
  a1: number;
  r0: number;
  r1: number;
  y0: number;
  y1: number;
  events: FlightEvent[];
}

/**
 * A stretch of a shot flown on the real ball physics ahead of time
 * (see `shot-trace.ts`): positions every `step` seconds, from one
 * contact with the iron or the glass to the next, with the spin it has.
 */
export interface TrackSeg {
  type: "track";
  dur: number;
  step: number;
  /** x, y, z of each sample in turn, the first at the start of the segment. */
  pts: number[];
  spin: V3;
  events: FlightEvent[];
}

export type Segment = ArcSeg | OrbitSeg | TrackSeg;

export interface Flight {
  segments: Segment[];
  total: number;
  /** The velocity (and spin) the ball leaves with when the chain ends, and what happens at that instant. */
  exit: { v: V3; spin?: V3; events: FlightEvent[] } | null;
}

export function flight(segments: Segment[], exit: Flight["exit"] = null): Flight {
  return { segments, total: segments.reduce((sum, s) => sum + s.dur, 0), exit };
}

/** An arc from p to t that peaks at `apex` (raised if the ends are higher). */
export function arcTo(p: V3, t: V3, apex: number, events: FlightEvent[] = []): ArcSeg {
  const top = Math.max(apex, p.y + 0.04, t.y + 0.04);
  const vy = Math.sqrt(2 * GRAVITY * (top - p.y));
  const dur = vy / GRAVITY + Math.sqrt((2 * (top - t.y)) / GRAVITY);
  return { type: "arc", dur, p, v: { x: (t.x - p.x) / dur, y: vy, z: (t.z - p.z) / dur }, g: 1, events };
}

/** An arc from p to t taking exactly `dur` seconds. */
export function arcTimed(p: V3, t: V3, dur: number, events: FlightEvent[] = [], g = 1): ArcSeg {
  const fall = 0.5 * GRAVITY * g * dur * dur;
  return { type: "arc", dur, p, v: { x: (t.x - p.x) / dur, y: (t.y - p.y + fall) / dur, z: (t.z - p.z) / dur }, g, events };
}

/** A point on a circle around the rim's axis. Angle 0 points along +x, a quarter turn along +z. */
export function rimPoint(angle: number, radius: number, y: number): V3 {
  return { x: RIM.x + Math.cos(angle) * radius, y, z: RIM.z + Math.sin(angle) * radius };
}

/** The angle around the rim that faces a spot on the floor. */
export function angleToward(x: number, z: number): number {
  return Math.atan2(z - RIM.z, x - RIM.x);
}

const ease = (u: number) => 1 - (1 - u) * (1 - u);

/** Where the ball is `s` seconds into a segment, and how fast it moves. */
export function sampleSegment(seg: Segment, s: number, pos: V3, vel: V3): void {
  if (seg.type === "track") return sampleTrack(seg, s, pos, vel);
  if (seg.type === "arc") {
    const g = GRAVITY * seg.g;
    pos.x = seg.p.x + seg.v.x * s;
    pos.y = seg.p.y + seg.v.y * s - 0.5 * g * s * s;
    pos.z = seg.p.z + seg.v.z * s;
    vel.x = seg.v.x;
    vel.y = seg.v.y - g * s;
    vel.z = seg.v.z;
    return;
  }
  const u = Math.min(1, Math.max(0, s / seg.dur));
  const a = seg.a0 + (seg.a1 - seg.a0) * ease(u);
  const r = seg.r0 + (seg.r1 - seg.r0) * u;
  const da = ((seg.a1 - seg.a0) * 2 * (1 - u)) / seg.dur;
  const dr = (seg.r1 - seg.r0) / seg.dur;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  pos.x = RIM.x + c * r;
  pos.y = seg.y0 + (seg.y1 - seg.y0) * u;
  pos.z = RIM.z + sn * r;
  vel.x = dr * c - r * sn * da;
  vel.y = (seg.y1 - seg.y0) / seg.dur;
  vel.z = dr * sn + r * c * da;
}

/** Between two recorded samples the ball moves in a straight line, which at sixty a second is smooth. */
function sampleTrack(seg: TrackSeg, s: number, pos: V3, vel: V3): void {
  const count = seg.pts.length / 3;
  const f = Math.max(0, s / seg.step);
  const i = Math.min(count - 2, Math.floor(f));
  if (i < 0) {
    pos.x = seg.pts[0]!;
    pos.y = seg.pts[1]!;
    pos.z = seg.pts[2]!;
    vel.x = vel.y = vel.z = 0;
    return;
  }
  const u = Math.min(1, f - i);
  const p = seg.pts;
  const j = i * 3;
  vel.x = (p[j + 3]! - p[j]!) / seg.step;
  vel.y = (p[j + 4]! - p[j + 1]!) / seg.step;
  vel.z = (p[j + 5]! - p[j + 2]!) / seg.step;
  pos.x = p[j]! + vel.x * seg.step * u;
  pos.y = p[j + 1]! + vel.y * seg.step * u;
  pos.z = p[j + 2]! + vel.z * seg.step * u;
}

/**
 * Samples a whole flight at time t. Returns the index of the segment the
 * ball is in, or -1 once the chain has ended.
 */
export function sampleFlight(f: Flight, t: number, pos: V3, vel: V3): number {
  let start = 0;
  for (let i = 0; i < f.segments.length; i++) {
    const seg = f.segments[i]!;
    if (t < start + seg.dur || i === f.segments.length - 1) {
      sampleSegment(seg, Math.min(t - start, seg.dur), pos, vel);
      return t >= f.total ? -1 : i;
    }
    start += seg.dur;
  }
  return -1;
}
