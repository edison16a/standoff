import type { Ball } from "./ball";
import { axisOf, spinOf, type Flight, type SpinStyle } from "./flight";
import type { Quat } from "./physics/quat";
import type { BallState } from "./types";
import type { V3 } from "./vec";

/** The last hard knock on the ball: how long ago, along what normal and how hard (newton seconds). */
export interface KnockView {
  age: number;
  n: V3;
  power: number;
}

/** The last time the ball hit the posts or the net: how long ago, what, where and how hard. */
export interface GoalHitView {
  age: number;
  part: "upright" | "crossbar" | "net";
  side: 1 | -1;
  y: number;
  z: number;
  power: number;
}

/** The ball for drawing: where it is, how it is turned and spinning, and what it last hit. */
export interface BallView extends V3 {
  vx: number;
  vy: number;
  vz: number;
  /** The ball's orientation: body +y is the long axis and body +z the laces. */
  quat: Quat;
  /** The long axis as a unit vector, and the spin about it in radians a second. */
  axis: V3;
  spin: number;
  style: SpinStyle;
  knock: KnockView | null;
  goal: GoalHitView | null;
  state: BallState;
  holder: number | null;
  /** In the air as a pitch on a run call, not a forward pass. */
  pitch: boolean;
}

/** The flight's last knock and goal hit, aged against the flight's own clock. */
function hits(f: Flight | null): { knock: KnockView | null; goal: GoalHitView | null } {
  if (!f) return { knock: null, goal: null };
  const k = f.knock;
  const g = f.goal;
  return {
    knock: k ? { age: f.t - k.t, n: { ...k.n }, power: k.impulse } : null,
    goal: g && g.kind !== "turf" ? { age: f.t - g.t, part: g.kind, side: g.side ?? 1, y: g.point?.y ?? 0, z: g.point?.z ?? 0, power: g.impulse } : null,
  };
}

export function ballView(b: Ball): BallView {
  const f = b.flight;
  return {
    x: b.pos.x, y: b.pos.y, z: b.pos.z,
    vx: f?.vel.x ?? 0, vy: f?.vel.y ?? 0, vz: f?.vel.z ?? 0,
    quat: f ? { ...f.q } : { x: 0, y: 0, z: 0, w: 1 },
    axis: f ? axisOf(f) : { x: 1, y: 0, z: 0 }, spin: f ? spinOf(f) : 0, style: f?.style ?? "spiral",
    ...hits(f),
    state: b.state, holder: b.state === "held" ? b.holder : null, pitch: b.state === "pass" && !!b.pass?.pitch,
  };
}
