import type { TeamId } from "../teams";
import { BALL, PITCH } from "./tuning";
import type { Ball } from "./types";
import type { Vec2 } from "./vec";

/** The x of the goal line a team defends. Red defends the left end. */
export function goalX(team: TeamId): number {
  return team === 0 ? -PITCH.halfLength : PITCH.halfLength;
}

/** The middle of a team's goal line, on the turf. */
export function goalCentre(team: TeamId): Vec2 {
  return { x: goalX(team), z: 0 };
}

/** The team whose goal the whole ball has gone into, or null. */
export function scoredIn(ball: Ball): TeamId | null {
  const { x, y, z } = ball.pos;
  if (Math.abs(x) < PITCH.halfLength + BALL.radius) return null;
  if (Math.abs(z) > PITCH.goalHalfWidth - PITCH.postRadius || y > PITCH.goalHeight) return null;
  return x < 0 ? 0 : 1;
}

/** The team whose end the ball went out over, or null while it is in play. */
export function outAt(ball: Ball): TeamId | null {
  const { x } = ball.pos;
  if (Math.abs(x) < PITCH.halfLength + BALL.radius) return null;
  if (scoredIn(ball) !== null) return null;
  return x < 0 ? 0 : 1;
}

/** Distance from a spot to the middle of the goal a team defends. */
export function toGoal(from: Vec2, team: TeamId): number {
  return Math.hypot(from.x - goalX(team), from.z);
}

/**
 * How far off straight on a spot is, 0 in front of the goal and up to
 * about 1.5 radians on the goal line, where the angle to shoot closes.
 */
export function shotAngle(from: Vec2, team: TeamId): number {
  const dx = Math.abs(from.x - goalX(team));
  return Math.atan2(Math.abs(from.z), Math.max(0.01, dx));
}

/** Whether a spot is inside the keeper's half circle. */
export function inBox(at: Vec2, team: TeamId): boolean {
  return toGoal(at, team) < PITCH.boxRadius;
}
