import type { BallCollider } from "./ball";
import { JUMP, jumpHeight } from "./defend";
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
