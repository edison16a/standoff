import { PITCH } from "../tuning";
import type { Ball } from "../types";
import type { Vec3 } from "../vec";
import { BALL_BODY, FRAME } from "./constants";
import { impact } from "./impulse";

const R = BALL_BODY.radius;
const HL = PITCH.halfLength;
const HW = PITCH.halfWidth;
const GW = PITCH.goalHalfWidth;
const PR = PITCH.postRadius;

export interface WallHit {
  kind: "board" | "cage";
  speed: number;
  at: Vec3;
}

/**
 * The side boards, with a cage net above them, so the ball never leaves
 * along the sides: the padded board gives a lively bounce, the netting
 * above swallows the pace.
 */
export function sideWalls(ball: Ball): WallHit | null {
  const p = ball.pos;
  if (Math.abs(p.z) < HW - R) return null;
  const side = Math.sign(p.z);
  p.z = side * (HW - R);
  const board = p.y < PITCH.boardHeight;
  const speed = impact(ball, {
    n: { x: 0, y: 0, z: -side },
    restitution: board ? FRAME.boardRestitution : FRAME.cageRestitution,
    friction: board ? FRAME.boardFriction : FRAME.cageFriction,
  });
  return speed > 0 ? { kind: board ? "board" : "cage", speed, at: { ...p } } : null;
}

/**
 * The end boards either side of the goal. Above them the ball flies out
 * for a goal kick, into the tall catch net that stops it.
 */
export function endWalls(ball: Ball): WallHit | null {
  const p = ball.pos;
  const end = Math.sign(p.x) || 1;
  const depth = Math.abs(p.x);
  let hit: WallHit | null = null;
  const besideGoal = Math.abs(p.z) > GW + PR;
  if (besideGoal && depth > HL - R && depth < HL + 0.4 && p.y < PITCH.boardHeight && ball.vel.x * end > 0) {
    p.x = end * (HL - R);
    const speed = impact(ball, { n: { x: -end, y: 0, z: 0 }, restitution: FRAME.boardRestitution, friction: FRAME.boardFriction });
    if (speed > 0) hit = { kind: "board", speed, at: { ...p } };
  }
  const stop = HL + PITCH.catchNet;
  if (depth > stop - R && ball.vel.x * end > 0) {
    p.x = end * (stop - R);
    const speed = impact(ball, { n: { x: -end, y: 0, z: 0 }, restitution: FRAME.cageRestitution, friction: FRAME.cageFriction });
    if (speed > 0) hit = { kind: "cage", speed, at: { ...p } };
  }
  return hit;
}
