import { attackSign, type TeamId } from "../teams";
import { clamp, type V2 } from "./vec";

/**
 * A full size field in metres. x runs the length with 0 at midfield and
 * z runs across. Storm (team 0) attacks +x. Positions along the field are
 * also given as a yard line for a team: its yards from its own goal line,
 * 0 to 100, which is how downs and distance are counted.
 */
export const YARD = 0.9144;

export const FIELD = {
  /** Goal lines, 50 yards either side of midfield. */
  goalX: 50 * YARD,
  /** End lines at the back of the 10 yard end zones. */
  endX: 60 * YARD,
  /** Sidelines, 53 and a third yards apart. */
  halfWidth: (160 / 3 / 2) * YARD,
  /** Hash marks, 70 feet 9 inches in from each sideline, where the ball is spotted. */
  hashZ: (160 / 3 / 2) * YARD - 21.56,
  /** How far outside the lines the players may wander, onto the sideline apron. */
  apron: 4,
} as const;

/** Goal posts stand on the end lines. */
export const POSTS = {
  x: FIELD.endX,
  /** Half the gap between the uprights (18 feet 6 inches apart). */
  halfGap: 5.64 / 2,
  crossbar: 3.05,
  /** The uprights rise 35 feet above the crossbar. */
  top: 3.05 + 10.67,
} as const;

/** The ground x of a team's yard line. */
export function yardToX(team: TeamId, yardline: number): number {
  return attackSign(team) * (yardline - 50) * YARD;
}

/** A team's yard line at ground x. Negative inside its own end zone, over 100 in the other. */
export function xToYard(team: TeamId, x: number): number {
  return (x * attackSign(team)) / YARD + 50;
}

/** The line a team's players must cross to score. */
export const scoringGoalX = (team: TeamId) => attackSign(team) * FIELD.goalX;

export function inBounds(p: V2): boolean {
  return Math.abs(p.z) <= FIELD.halfWidth && Math.abs(p.x) <= FIELD.endX;
}

/** Inside the end zone that `team` scores in. */
export function inScoringEndZone(team: TeamId, p: V2): boolean {
  const yl = xToYard(team, p.x);
  return yl >= 100 && yl <= 110 && Math.abs(p.z) <= FIELD.halfWidth;
}

/** Inside the end zone that `team` defends. */
export function inOwnEndZone(team: TeamId, p: V2): boolean {
  const yl = xToYard(team, p.x);
  return yl <= 0 && yl >= -10;
}

/** Where a player may stand: the field plus the apron around it. */
export function clampToWorld(p: V2): V2 {
  const x = FIELD.endX + FIELD.apron;
  const z = FIELD.halfWidth + FIELD.apron;
  return { x: clamp(p.x, -x, x), z: clamp(p.z, -z, z) };
}

/** Across the field, the ball is spotted between the hashes. */
export const spotZ = (z: number) => clamp(z, -FIELD.hashZ, FIELD.hashZ);
