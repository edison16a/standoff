import type { MatchView } from "../../engine/view";
import type { Aim, Vec } from "./shots";

/**
 * One axis of a critically damped spring, stepped implicitly so it is
 * stable at any frame time. Unlike a plain exponential chase it eases in
 * as well as out: the camera starts after the play gently, the way an
 * operator swings a heavy broadcast head, and never overshoots.
 */
export function springStep(x: number, v: number, target: number, omega: number, dt: number): [number, number] {
  const f = 1 + 2 * dt * omega;
  const oo = omega * omega;
  const hoo = dt * oo;
  const hhoo = dt * hoo;
  const inv = 1 / (f + hhoo);
  return [(f * x + dt * v + hhoo * target) * inv, (v + hoo * (target - x)) * inv];
}

/** A point on springs, axis by axis. */
export class Spring3 {
  readonly at: Vec = { x: 0, y: 0, z: 0 };
  private readonly v: Vec = { x: 0, y: 0, z: 0 };

  /** Jumps straight to `p` and stops, for a cut. */
  snap(p: Vec): void {
    Object.assign(this.at, p);
    Object.assign(this.v, { x: 0, y: 0, z: 0 });
  }

  step(target: Vec, omega: number, dt: number): void {
    for (const k of ["x", "y", "z"] as const) [this.at[k], this.v[k]] = springStep(this.at[k], this.v[k], target[k], omega, dt);
  }
}

/** How far the look leads the ball, in seconds of its travel, and at most how many metres. */
const LEAD_S = 0.35;
const LEAD_MAX = 3.5;

/**
 * The broadcast touches on the live shot. The lens leads the ball a
 * little the way it is moving, so a runner has room to run into, and
 * the zoom breathes with the play: a touch tighter while the teams set,
 * opening as the ball moves fast or flies deep. The keep points are
 * framed afterwards (fit.ts), so the zoom never crops the formation.
 */
export function broadcastAim(aim: Aim, view: MatchView): Aim {
  if (aim.kind !== "behind") return aim;
  const b = view.ball;
  const live = view.phase === "live";
  const speed = live ? Math.hypot(b.vx, b.vz) : 0;
  const clamp = (n: number) => Math.max(-LEAD_MAX, Math.min(LEAD_MAX, n));
  const look = live ? { x: aim.look.x + clamp(b.vx * LEAD_S), y: aim.look.y, z: aim.look.z + clamp(b.vz * LEAD_S) } : aim.look;
  const presnap = view.phase === "choose" || view.phase === "presnap" || view.phase === "convert";
  const zoom = presnap ? -3 : Math.min(4, speed * 0.25);
  return { ...aim, look, fov: aim.fov + zoom };
}
