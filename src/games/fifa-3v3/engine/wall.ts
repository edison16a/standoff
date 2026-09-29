import type { TeamId } from "../teams";
import { goalX } from "./goal";
import { PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { add, dist, norm, scale, sub, type Vec2 } from "./vec";

export const WALL = {
  /** Ten yards, as in the laws of the game. */
  distance: 9.15,
  /** A wall never stands closer to the goal line than this. */
  fromGoal: 3.2,
  /** Shoulder to shoulder. */
  spacing: 0.56,
  size: 3,
} as const;

export interface WallLine {
  /** The middle of the wall. */
  centre: Vec2;
  /** Along the wall, to the right as the kicker sees it. */
  along: Vec2;
  /** From the ball toward the wall. */
  toward: Vec2;
}

/**
 * Where the wall stands: ten yards from the ball on the line to the near
 * half of the goal, so it covers the near post and the keeper takes the
 * far side. Close in, it gives ground and stands a few metres out.
 */
export function wallLine(spot: Vec2, defending: TeamId): WallLine {
  const gx = goalX(defending);
  const near = Math.abs(spot.z) < 0.6 ? 0 : Math.sign(spot.z) * PITCH.goalHalfWidth * 0.5;
  const aim = { x: gx, z: near };
  const toward = norm(sub(aim, spot));
  const range = dist(spot, aim);
  const d = Math.min(WALL.distance, Math.max(range - WALL.fromGoal, range * 0.5));
  // To the kicker's right: the kicker faces `toward`, and right is the turn toward +z from +x.
  const along = { x: -toward.z, z: toward.x };
  return { centre: add(spot, toward, d), along, toward };
}

/** The spots for a wall of `n`, from the kicker's left to right. */
export function wallSpots(line: WallLine, n: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) out.push(add(line.centre, line.along, (i - (n - 1) / 2) * WALL.spacing));
  return out;
}

/**
 * Lines up the defending side's players in the wall, each walking to
 * the nearest free spot so nobody crosses another, all facing the ball.
 */
export function formWall(state: MatchState, defending: TeamId, spot: Vec2): number[] {
  const line = wallLine(spot, defending);
  const players = state.athletes.filter((a) => a.team === defending).slice(0, WALL.size);
  const spots = wallSpots(line, players.length);
  const free = [...players];
  const ids: number[] = [];
  for (const s of spots) {
    free.sort((p, q) => dist(p.pos, s) - dist(q.pos, s));
    const a = free.shift()!;
    place(a, s, spot);
    ids.push(a.id);
  }
  return ids;
}

/** Stands a player on a spot, facing a point. */
export function place(a: Athlete, at: Vec2, facing: Vec2): void {
  a.pos = { ...at };
  a.vel = { x: 0, z: 0 };
  const to = sub(facing, at);
  a.facing = Math.atan2(to.z, to.x);
}

/**
 * Where the taker waits for the run up: `back` metres behind the ball on
 * the line from the goal and `side` metres to the kicker's right (left
 * when negative), so the run comes in at an angle onto the kicking foot
 * and the camera behind the ball sees the ball and the white line.
 */
export function behindBall(spot: Vec2, defending: TeamId, back: number, side = 0): Vec2 {
  const toward = norm(sub({ x: goalX(defending), z: 0 }, spot));
  const right = { x: -toward.z, z: toward.x };
  return add(add(spot, scale(toward, -back)), right, side);
}
