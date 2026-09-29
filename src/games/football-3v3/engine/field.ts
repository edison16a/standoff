import { attackSign, type TeamId } from "../teams";
import { clamp } from "./vec";

/**
 * A full size field in yards, centred on the 50: goal lines at x = ±50,
 * end lines ten yards behind them, and 53⅓ yards from sideline to
 * sideline. NFL hash marks and goal posts on the end lines.
 */
export const FIELD = {
  goalLine: 50,
  endLine: 60,
  halfWidth: 160 / 6,
  /** Hash marks sit this far either side of the middle. */
  hash: 3.083,
  /** Inside width of the uprights, and their centre to one side. */
  postHalfWidth: 3.083,
  crossbar: 10 / 3,
  /** How far above the crossbar the uprights reach. */
  uprightTop: 10 / 3 + 10,
} as const;

/** The x of the goal line a team scores in. */
export function goalLineOf(team: TeamId): number {
  return attackSign(team) * FIELD.goalLine;
}

/** The x of the goal line a team defends. */
export function ownGoalLine(team: TeamId): number {
  return -goalLineOf(team);
}

/** Yards from x to the end zone a team attacks: 100 at its own goal line, 0 at the other. */
export function yardsToGoal(team: TeamId, x: number): number {
  return FIELD.goalLine - attackSign(team) * x;
}

/** The x of the spot a given number of yards from the goal a team attacks. */
export function xFromGoal(team: TeamId, yards: number): number {
  return attackSign(team) * (FIELD.goalLine - yards);
}

/** The x of a team's own yard line: its own 25 is 25 yards out of its end zone. */
export function ownYardLine(team: TeamId, yards: number): number {
  return xFromGoal(team, 100 - yards);
}

/** How far downfield x is from `from`, for the team attacking: negative is a loss. */
export function gain(team: TeamId, from: number, to: number): number {
  return attackSign(team) * (to - from);
}

/** The yard line number painted on the field at x: 0 at a goal line up to 50. */
export function yardNumber(x: number): number {
  return Math.round(FIELD.goalLine - Math.abs(clamp(x, -FIELD.goalLine, FIELD.goalLine)));
}

/**
 * The spot as a broadcaster says it, from the offence's view: "OWN 25",
 * "OPP 12" or "50".
 */
export function spotLabel(team: TeamId, x: number): string {
  const n = yardNumber(x);
  if (n === 50) return "50";
  return yardsToGoal(team, x) > 50 ? `OWN ${n}` : `OPP ${n}`;
}

/** Inside the end zone a team attacks (the ball carrier scores there). */
export function inEndZone(team: TeamId, x: number): boolean {
  return attackSign(team) * x >= FIELD.goalLine;
}

/** Inside the end zone a team defends. */
export function inOwnEndZone(team: TeamId, x: number): boolean {
  return attackSign(team) * x <= -FIELD.goalLine;
}

export function outOfBounds(x: number, z: number): boolean {
  return Math.abs(z) > FIELD.halfWidth || Math.abs(x) > FIELD.endLine;
}

/** The next snap is between the hashes, as in the NFL. */
export function hashZ(z: number): number {
  return clamp(z, -FIELD.hash, FIELD.hash);
}
