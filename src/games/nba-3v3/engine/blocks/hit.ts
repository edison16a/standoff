import type { Match } from "../match";
import type { BallBody } from "../physics/air";
import { BOARD, RIM } from "../tuning";
import type { V2, V3 } from "../vec";
import { deflect, pin, reject, stands, swat, tipShot } from "./exits";

/**
 * What the hand does to the ball, set by the block preset (see
 * `presets.ts`): stuffed back down with two hands, swung into the
 * stands, slapped away, pinned to the glass, only fingertipped, or
 * knocked back off a closeout. Each sets the ball off on its own real
 * flight; from then on the physics alone has it.
 */
export const BLOCK_HITS = ["reject", "stands", "swat", "pin", "tip", "deflect"] as const;
export type BlockHit = (typeof BLOCK_HITS)[number];

/** Beyond this share of the arm's reach a block is only a fingertip on the ball. */
const TIP_REACH = 0.7;

/** Whether a hand that gets to the ball only gets fingertips on it: its path grazes the end of the reach. */
export function fingertip(body: Pick<BallBody, "pos" | "vel">, s: { x: number; y: number; z: number; reach: number }): boolean {
  return closestPass(body, s) > s.reach * TIP_REACH;
}

/** How near the ball's straight path comes to the shoulder from here on. */
function closestPass(body: Pick<BallBody, "pos" | "vel">, s: { x: number; y: number; z: number }): number {
  const rx = body.pos.x - s.x;
  const ry = body.pos.y - s.y;
  const rz = body.pos.z - s.z;
  const v = body.vel;
  const vv = v.x * v.x + v.y * v.y + v.z * v.z;
  const t = vv > 1e-6 ? Math.max(0, -(rx * v.x + ry * v.y + rz * v.z) / vv) : 0;
  return Math.hypot(rx + v.x * t, ry + v.y * t, rz + v.z * t);
}

/** Close enough to the glass, and high enough, to pin it there. */
export const byGlass = (p: V3): boolean => p.z < BOARD.face + 0.75 && Math.abs(p.x) < BOARD.halfWidth + 0.15 && p.y > RIM.y - 0.35;

/** Sends the ball off the hand the way the hit does. `from` is where the blocker is, for the way his hand swings. */
export function applyHit(m: Match, body: BallBody, hit: BlockHit, from: V2 | null = null): void {
  switch (hit) {
    case "reject":
      return reject(m, body);
    case "stands":
      return stands(m, body);
    case "pin":
      // Only flat to the glass if the glass is there: off it, the palm slaps it away instead.
      return byGlass(body.pos) ? pin(m, body) : swat(m, body, from);
    case "tip":
      return tipShot(m, body);
    case "deflect":
      return deflect(m, body);
    case "swat":
      return swat(m, body, from);
  }
}
