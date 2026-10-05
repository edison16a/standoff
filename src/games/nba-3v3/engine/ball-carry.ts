import type { Match } from "./match";
import type { V3 } from "./vec";

/** Moves the ball with the hands to `to`: its velocity is the hands' own and its spin is held still. */
export function carry(m: Match, to: V3, dt: number): void {
  const b = m.ball;
  const k = dt > 0 ? 1 / dt : 0;
  b.vel = { x: (to.x - b.pos.x) * k, y: (to.y - b.pos.y) * k, z: (to.z - b.pos.z) * k };
  b.pos = { ...to };
  b.w = { x: 0, y: 0, z: 0 };
  b.hand = "held";
}
