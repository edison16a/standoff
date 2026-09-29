import { ballSpeed } from "./ball";
import { jumpHeight } from "./defend";
import { BALL } from "./tuning";
import type { Athlete, MatchState } from "./types";

/** A body as the ball sees it: a column from the boots up past the head, and the arms when they go up. */
export const BODY = {
  radius: 0.27,
  /** Boots to the top of the head, and to the raised hands in a jump. */
  height: 1.85,
  reach: 2.2,
  /** How much of its speed into the body the ball keeps as it flies off. */
  restitution: 0.38,
  /** A ball slower than this is simply controlled or rolls past. */
  minSpeed: 6,
} as const;

/** Who stands in the ball's way as a solid body: players leaping to block, and the free kick wall. */
function blocking(state: MatchState, a: Athlete): boolean {
  if (a.action === "jump") return true;
  return state.setPiece !== null && state.setPiece.wall.includes(a.id) && state.setPiece.stage === "struck";
}

/**
 * A loose ball flying into a blocking body comes off it: bounced back
 * off the curve of the body with most of its pace gone, lifted a little
 * and spinning, rather than stopping dead. Each body can only be hit
 * once in quick succession.
 */
export function blockBall(state: MatchState): void {
  const ball = state.ball;
  if (ball.owner || ball.inGoal !== null) return;
  const speed = ballSpeed(ball);
  if (speed < BODY.minSpeed) return;
  for (const a of state.athletes) {
    if (a.noTouch > 0 || !blocking(state, a)) continue;
    const lift = jumpHeight(a);
    const top = lift + (a.action === "jump" ? BODY.reach : BODY.height);
    if (ball.pos.y < lift + BALL.radius * 0.5 || ball.pos.y > top + BALL.radius) continue;
    const dx = ball.pos.x - a.pos.x;
    const dz = ball.pos.z - a.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > BODY.radius + BALL.radius || d < 1e-6) continue;
    const nx = dx / d;
    const nz = dz / d;
    const into = ball.vel.x * nx + ball.vel.z * nz;
    // Already heading away from this body.
    if (into >= 0) continue;
    const r = state.rng;
    // Push the ball back out of the body, then reflect the part of its motion into it.
    ball.pos.x = a.pos.x + nx * (BODY.radius + BALL.radius);
    ball.pos.z = a.pos.z + nz * (BODY.radius + BALL.radius);
    const bounce = (1 + BODY.restitution) * into;
    ball.vel.x = (ball.vel.x - bounce * nx) * 0.55;
    ball.vel.z = (ball.vel.z - bounce * nz) * 0.55;
    // Off the chest or the thigh it pops up; off a raised arm or the head it loops.
    const high = ball.pos.y > lift + 1.45;
    ball.vel.y = Math.max(ball.vel.y * 0.3, 0) + r.range(high ? 2 : 0.8, high ? 4.5 : 2.4);
    ball.spin = { x: r.range(-8, 8), y: r.range(-12, 12), z: r.range(-8, 8) };
    ball.lastTouch = { team: a.team, id: a.id };
    ball.passTo = null;
    a.noTouch = 0.35;
    const shot = state.flight;
    if (shot && !shot.resolved && shot.team !== a.team) a.stats.blocks++;
    if (shot) shot.resolved = true;
    state.events.push({ type: "block", athlete: a.id, speed: -into, at: { ...ball.pos } });
    return;
  }
}
