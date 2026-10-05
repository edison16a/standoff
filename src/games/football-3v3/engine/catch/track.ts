import { topSpeed } from "../body";
import type { Match } from "../match";
import type { Athlete } from "../types";
import type { V2 } from "../vec";
import { meetPoint } from "./path";
import { reachOf } from "./reach";

/**
 * Reading the ball in the air: the stick that takes a player to where
 * he can get his hands on it, for the receiver it was thrown to and a
 * defender who jumped the route. Null when he has no ball to read.
 */
export function ballTrack(m: Match, a: Athlete): V2 | null {
  return readBall(m, a)?.stick ?? null;
}

/** The read itself: the stick, and how long until the ball gets there. */
export function readBall(m: Match, a: Athlete): { stick: V2; wait: number } | null {
  const pass = m.ball.pass;
  if (m.ball.state !== "pass" || !pass?.path) return null;
  if (a.id !== pass.to && a.id !== pass.interceptor) return null;
  const top = topSpeed(a, false);
  const meet = meetPoint(pass.path, m.time, a, top, reachOf(a).radius * 0.3);
  if (!meet) return null;
  const dx = meet.spot.x - a.x;
  const dz = meet.spot.z - a.z;
  if (Math.hypot(dx, dz) < 0.15) return { stick: { x: 0, z: 0 }, wait: meet.wait };
  // Pace the run to get there as the ball does, not early and past it.
  const k = 1 / (Math.max(0.1, meet.wait - 0.05) * top);
  const l = Math.hypot(dx * k, dz * k);
  return { stick: l > 1 ? { x: (dx * k) / l, z: (dz * k) / l } : { x: dx * k, z: dz * k }, wait: meet.wait };
}

/**
 * A person's stick with the read blended in: his legs go after the ball
 * on their own, as a receiver's eyes take over once it is in the air.
 * Pushing the stick well away from it still takes him off it, a little
 * less the closer the ball is.
 */
export function withTrack(stick: V2, track: V2, wait: number): V2 {
  const against = stick.x * track.x + stick.z * track.z < -0.2 * Math.hypot(track.x, track.z);
  const share = against ? (wait < 0.5 ? 0.6 : 0.35) : 1;
  const x = stick.x * (1 - share) + track.x * share;
  const z = stick.z * (1 - share) + track.z * share;
  const l = Math.hypot(x, z);
  return l > 1 ? { x: x / l, z: z / l } : { x, z };
}
