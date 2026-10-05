import type { BallCollider } from "./ball";
import { JUMP, jumpHeight } from "./defend";
import { ready } from "./reach";
import type { Athlete, MatchState } from "./types";

/** A body as the ball sees it: a column from the shins up past the head, and the arms when they go up. */
export const BODY = {
  radius: 0.24,
  /** Boots to the top of the head, and to the raised hands in a jump. */
  height: 1.85,
  reach: 2.2,
  /** How much of its speed into the body the ball keeps as it flies off. */
  restitution: 0.38,
  friction: 0.5,
} as const;

/** Who stands in the ball's way as a solid body: players leaping to block, and the free kick wall. */
export function blocking(state: MatchState, a: Athlete): boolean {
  if (a.action === "jump") return true;
  return state.setPiece !== null && state.setPiece.wall.includes(a.id) && state.setPiece.stage === "struck";
}

/** Upright and in the way: not sliding along the turf or down on it. */
function upright(a: Athlete): boolean {
  return a.action !== "slide" && a.action !== "getup" && a.action !== "stumble" && a.action !== "celebrate";
}

/**
 * Everyone the ball can run into this step. A player ready to play a
 * low ball meets it with his feet instead (control.ts), and nobody is in
 * the way of a ball at his own feet or one he has only just struck; the
 * rest stand there as shins, a body and a head, so a pass through a
 * crowd can clip a leg and a shot can hit a man square.
 */
export function bodyColliders(state: MatchState, out: BallCollider[]): void {
  blockerColliders(state, out);
  const ball = state.ball;
  const owner = ball.owner?.kind === "athlete" ? ball.owner.id : null;
  const kicker = ball.lastTouch?.id ?? null;
  for (const a of state.athletes) {
    if (blocking(state, a) || !upright(a) || a.id === owner) continue;
    if (a.id === kicker && state.time - ball.struckAt < 0.35) continue;
    if (ball.pos.y < 0.95 && ready(state, a)) continue;
    const vel = { x: a.vel.x, y: 0, z: a.vel.z };
    const legs = { a: { x: a.pos.x, y: 0.14, z: a.pos.z }, b: { x: a.pos.x, y: 1.42, z: a.pos.z }, radius: 0.2 };
    out.push({ id: a.id, kind: "body", shape: legs, vel, restitution: BODY.restitution, friction: BODY.friction });
    const head = { x: a.pos.x + Math.cos(a.facing) * 0.04, y: 1.7, z: a.pos.z + Math.sin(a.facing) * 0.04 };
    out.push({ id: a.id, kind: "head", shape: { a: head, b: head, radius: 0.12 }, vel, restitution: 0.55, friction: 0.4 });
  }
}

/**
 * The blocking bodies this step, as colliders for the ball. The column
 * rises with the jump and moves with the body, so a ball fired into a
 * leaping man glances off the curve of him, loses most of its pace and
 * spins away, rather than stopping dead.
 */
export function blockerColliders(state: MatchState, out: BallCollider[]): void {
  for (const a of state.athletes) {
    if (a.noTouch > 0 || !blocking(state, a)) continue;
    const lift = jumpHeight(a);
    const top = lift + (a.action === "jump" ? BODY.reach : BODY.height);
    // How fast the body is rising or falling in the leap.
    const u = a.actionLen > 0 ? Math.max(0, Math.min(1, a.actionT / a.actionLen)) : 0;
    const rise = a.action === "jump" && a.actionT > 0 ? (4 * JUMP.height * (1 - 2 * u)) / Math.max(0.1, a.actionLen) : 0;
    out.push({
      id: a.id,
      kind: "body",
      // The legs hang below a leaping body, so a ball skimming under it can still clip a boot.
      shape: { a: { x: a.pos.x, y: lift * 0.4 + 0.12, z: a.pos.z }, b: { x: a.pos.x, y: top - 0.15, z: a.pos.z }, radius: BODY.radius },
      vel: { x: a.vel.x, y: rise, z: a.vel.z },
      restitution: BODY.restitution,
      friction: BODY.friction,
    });
  }
}

/** The ball struck a body: it was blocked, and a shot it was is over. */
export function onBodyHit(state: MatchState, a: Athlete, speed: number): void {
  const ball = state.ball;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.struckAt = state.time;
  ball.passTo = null;
  ball.owner = null;
  a.noTouch = 0.35;
  const shot = state.flight;
  if (shot && !shot.resolved) {
    if (shot.team !== a.team) a.stats.blocks++;
    shot.resolved = true;
    shot.outcome = "block";
  }
  state.events.push({ type: "block", athlete: a.id, speed, at: { ...ball.pos } });
}
