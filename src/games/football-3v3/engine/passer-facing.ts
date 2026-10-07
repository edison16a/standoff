import type { Match } from "./match";
import { canThrow } from "./passing";
import { canPitch } from "./run-play";
import type { Athlete } from "./types";
import { dir2, type V2 } from "./vec";

/**
 * Where a passer looks, whatever way his legs carry him. Without this a
 * QB faced his own run: dropping back he turned his back to the field,
 * and a throw made while drifting back left his hand with his chest to
 * his own end zone. A real passer backpedals with his eyes downfield and
 * turns his shoulders square to the target before the ball goes.
 */
export function passerLook(m: Match, a: Athlete): V2 | null {
  const act = a.action;
  if (act.kind === "throw") return throwLook(m, a, act.to, act.released);
  if (a.role !== "qb" || m.carrier()?.id !== a.id || !(canThrow(m, a) || canPitch(m, a))) return null;
  const speed = Math.hypot(a.vx, a.vz);
  if (speed < 0.8) return null;
  // Drifting back he keeps facing the way his team attacks; moving across or up he faces his run.
  const ahead = (a.vx * m.sign) / speed;
  return ahead < -0.25 ? { x: m.sign, z: 0 } : null;
}

/** Square to the receiver until the ball goes, then along the throw for the follow through. */
function throwLook(m: Match, a: Athlete, to: number, released: boolean): V2 | null {
  const pass = m.ball.pass;
  if (released && pass && pass.from === a.id) return lookAt(a, pass.spot);
  const target = m.athlete(to);
  return target ? lookAt(a, target) : null;
}

function lookAt(a: Athlete, at: V2): V2 | null {
  const d = dir2(a, at);
  return d.x === 0 && d.z === 0 ? null : d;
}

/** Where the ball leaves a passer's hand: a step out toward the target, whichever way he faces. */
export function handSpot(a: Athlete, to: V2, height: number): { x: number; y: number; z: number } {
  const d = dir2(a, to);
  return { x: a.x + d.x * 0.3, y: height, z: a.z + d.z * 0.3 };
}
