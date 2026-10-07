import { isDown, statsOf } from "./body";
import type { Match } from "./match";
import { PLAIN, type PassQuality } from "./pass-meter";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import type { V3 } from "./vec";

/**
 * A real arm is never perfect. The aim is solved to lead the receiver,
 * then the release is off by a little: the line, the height and the
 * pace, and the spiral's spin and wobble. A strong arm throws tighter;
 * a defender in the QB's face makes everything worse. The error turns
 * into a real flight, so a throw a yard off is caught or dropped by how
 * it reaches the hands. Moving or standing makes no difference.
 */
export const ERROR = {
  /** Spread of the line and height, radians, for a perfect arm and per point of arm short of 10. */
  line: 0.008,
  perArm: 0.0016,
  /** Spread of the release speed, as a share. */
  pace: 0.012,
  /** Pressure: a defender within this many metres, and what he adds at arm's length. */
  rush: 3,
  rushLine: 0.014,
  rushPace: 0.012,
  rushSpin: 0.18,
  rushWobble: 0.06,
} as const;

export interface Release {
  vel: V3;
  spin: number;
  /** Half angle of the wobble cone, radians: a tight spiral is a few hundredths. */
  wobble: number;
}

/** How close the nearest pass rusher is, 0 (nobody near) to 1 (in his face). */
export function pressure(m: Match, qb: Athlete): number {
  let near = Infinity;
  for (const o of m.athletes) {
    // A rusher who shed his blocker counts; one still locked up does not.
    if (o.team === qb.team || (o.role === "lineman" && !m.lines[o.slot]?.loose) || isDown(o)) continue;
    near = Math.min(near, Math.hypot(o.x - qb.x, o.z - qb.z));
  }
  return Math.max(0, 1 - near / ERROR.rush);
}

/** Turns v about the vertical by `yaw` and tips it up by `pitch`, then scales it. */
function offLine(v: V3, yaw: number, pitch: number, scale: number): V3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const x = v.x * c - v.z * s;
  const z = v.x * s + v.z * c;
  const flat = Math.hypot(x, z);
  const up = Math.atan2(v.y, flat) + pitch;
  const speed = Math.hypot(v.x, v.y, v.z) * scale;
  const k = flat > 1e-9 ? (Math.cos(up) * speed) / flat : 0;
  return { x: x * k, y: Math.sin(up) * speed, z: z * k };
}

/** The ball as it actually leaves the hand for an aimed velocity, as tight as the meter's timing allows. */
export function release(m: Match, qb: Athlete, aimed: V3, q: Pick<PassQuality, "line" | "wobble"> = PLAIN): Release {
  const r = m.rng;
  const arm = statsOf(qb).arm;
  const p = pressure(m, qb);
  const line = (ERROR.line + (10 - arm) * ERROR.perArm + p * ERROR.rushLine + Math.min(0.01, qb.jukeHeat * 0.003)) * q.line;
  const vel = offLine(aimed, r.gauss(line), r.gauss(line * 0.8), 1 + r.gauss(ERROR.pace + p * ERROR.rushPace));
  const spin = PASS.spin * (0.85 + arm * 0.02) * (1 - p * ERROR.rushSpin) * (1 + r.gauss(0.05));
  const wobble = (0.02 + (10 - arm) * 0.005 + p * ERROR.rushWobble + Math.abs(r.gauss(0.015))) * q.wobble;
  return { vel, spin, wobble };
}
