import { other } from "../teams";
import { newBall, stepBall } from "./ball";
import { blockColumn, touch } from "./body-block";
import { WALL } from "./defence-tuning";
import { goalX } from "./goal";
import type { Launch } from "./set-piece-kick";
import { BALL, PITCH, STEP } from "./tuning";
import type { Athlete, MatchState, SetPiece } from "./types";
import { dist, norm, sub, type Vec2 } from "./vec";

/** Whether a free kick from here is close enough to goal to need a wall. */
export function wantsWall(spot: Vec2, defending: 0 | 1): boolean {
  return Math.hypot(spot.x - goalX(defending), spot.z) < WALL.range;
}

/**
 * Lines the wall up: shoulder to shoulder at the right distance from
 * the ball, across the line to the near half of the goal, so the
 * keeper covers the far side. Everyone in it faces the ball.
 */
export function placeWall(sp: Pick<SetPiece, "spot" | "team">, members: Athlete[]): void {
  const defending = other(sp.team);
  const side = Math.sign(sp.spot.z) || 1;
  const cover = { x: goalX(defending), z: side * PITCH.goalHalfWidth * 0.35 };
  const dir = norm(sub(cover, sp.spot));
  const across = { x: -dir.z, z: dir.x };
  const centre = { x: sp.spot.x + dir.x * WALL.distance, z: sp.spot.z + dir.z * WALL.distance };
  const n = members.length;
  members.forEach((a, i) => {
    const offset = (i - (n - 1) / 2) * WALL.spacing;
    a.pos = { x: centre.x + across.x * offset, z: centre.z + across.z * offset };
    a.facing = Math.atan2(sp.spot.z - a.pos.z, sp.spot.x - a.pos.x);
    a.action = "wall";
    a.actionT = 0;
    a.actionLen = 0;
  });
}

/** The defenders who make the wall: the outfield players nearest the ball, up to three. */
export function wallMembers(state: MatchState, sp: Pick<SetPiece, "spot" | "team">): Athlete[] {
  return state.athletes
    .filter((a) => a.team !== sp.team)
    .sort((a, b) => dist(a.pos, sp.spot) - dist(b.pos, sp.spot))
    .slice(0, WALL.size);
}

/**
 * Whether a kick would hit the wall, which jumps as it is struck. Flown
 * with the same physics and the same jump as the match, so a kick called
 * clear sails over (or under) exactly as foreseen.
 */
export function wallBlocks(state: MatchState, sp: SetPiece, launch: Launch): boolean {
  if (sp.wall.length === 0) return false;
  const ball = newBall();
  ball.pos = { x: sp.spot.x, y: BALL.radius, z: sp.spot.z };
  ball.vel = { ...launch.vel };
  ball.spin = { ...launch.spin };
  const members = sp.wall.map((id) => state.athletes[id]!).map((a) => ({ ...a, action: "jump" as const, actionT: 0 }));
  for (let t = STEP; t < 0.9; t += STEP) {
    stepBall(ball, STEP, [], { flightOnly: true });
    for (const m of members) {
      m.actionT = t;
      const column = blockColumn(m);
      if (column && touch(column, ball.pos)) return true;
    }
  }
  return false;
}
