import { clampToWorld } from "./field";
import { launch, predict, type SpinStyle } from "./flight";
import { BALL, PASS } from "./tuning";
import { clamp, norm2, type V2, type V3 } from "./vec";

export interface Candidate {
  id: number;
  x: number;
  z: number;
}

/**
 * Assisted aim: the throw stick draws an invisible line out from the QB
 * and the receiver nearest that line is the target. Receivers behind the
 * QB only count when nobody is ahead of the line at all.
 */
export function pickTarget(from: V2, aim: V2, receivers: readonly Candidate[]): number | null {
  const dir = norm2(aim);
  if (dir.x === 0 && dir.z === 0) return null;
  let best: number | null = null;
  let bestScore = Infinity;
  for (const r of receivers) {
    const rx = r.x - from.x;
    const rz = r.z - from.z;
    const along = rx * dir.x + rz * dir.z;
    const off = Math.abs(rx * dir.z - rz * dir.x);
    const score = along > 0 ? off : 1000 + Math.hypot(rx, rz);
    if (score < bestScore) {
      bestScore = score;
      best = r.id;
    }
  }
  return best;
}

/** How long a pass of this length hangs in the air: short ones are fired, deep ones given air. */
export function flightTime(distance: number, arm: number): number {
  const horizontal = clamp(13 + 0.25 * distance, 14, 22) * (0.9 + arm * 0.02);
  return Math.max(0.35, distance / horizontal);
}

/**
 * The launch velocity that carries the ball from `from` to `to` in
 * exactly `time` seconds through the real drag, found by shooting: start
 * from the airless answer, fly it, and correct by the miss a few times.
 */
export function solveLaunch(from: V3, to: V3, time: number, style: SpinStyle, spin: number): V3 {
  const v: V3 = {
    x: (to.x - from.x) / time,
    y: (to.y - from.y) / time + 0.5 * BALL.gravity * time,
    z: (to.z - from.z) / time,
  };
  for (let i = 0; i < 6; i++) {
    const end = predict(launch(from, v, style, spin, 0), time).pos;
    v.x += (to.x - end.x) / time;
    v.y += (to.y - end.y) / time;
    v.z += (to.z - end.z) / time;
  }
  return v;
}

export interface Lead {
  /** Where the receiver and the ball meet. */
  spot: V2;
  time: number;
  vel: V3;
}

/**
 * Throws to where the receiver will be, not where they are: it guesses
 * the flight time, moves the receiver on by their run for that long,
 * and settles on a spot after a few rounds.
 */
export function leadPass(from: V3, receiver: V2, run: V2, arm: number, timeScale = 1): Lead {
  // The meter's timing sets the pace: a firm ball gets there sooner, a floater hangs.
  const hang = (d: number) => flightTime(d, arm) * timeScale;
  let spot: V2 = { x: receiver.x, z: receiver.z };
  let time = hang(Math.hypot(spot.x - from.x, spot.z - from.z));
  for (let i = 0; i < 4; i++) {
    spot = clampToWorld({ x: receiver.x + run.x * time, z: receiver.z + run.z * time });
    time = hang(Math.hypot(spot.x - from.x, spot.z - from.z));
  }
  const vel = solveLaunch(from, { x: spot.x, y: PASS.catchHeight, z: spot.z }, time, "spiral", PASS.spin);
  return { spot, time, vel };
}
