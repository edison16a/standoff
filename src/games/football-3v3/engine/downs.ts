import { other, type TeamId } from "../teams";
import { RULES } from "./tuning";
import { clamp } from "./vec";

/**
 * The state of a possession: who has the ball, the line of scrimmage as
 * the offense's yard line (0 is their own goal line, 100 the one they
 * score at), the down and the first down line. A try after a touchdown
 * is one play from a set spot with no downs.
 */
export interface Drive {
  offense: TeamId;
  los: number;
  down: number;
  firstDownAt: number;
  /** Across the field, where the ball is spotted between the hashes. */
  ballZ: number;
  conversion: boolean;
}

export function newDrive(offense: TeamId, yardline: number, ballZ = 0): Drive {
  const los = clamp(yardline, 1, 99);
  return { offense, los, down: 1, firstDownAt: Math.min(100, los + RULES.toGain), ballZ, conversion: false };
}

export function tryDrive(offense: TeamId, yardline: number): Drive {
  return { offense, los: yardline, down: 1, firstDownAt: 100, ballZ: 0, conversion: true };
}

/** Yards to go for a first down. */
export const toGo = (d: Drive) => d.firstDownAt - d.los;

/** Inside the ten, the first down line is the goal line: "and goal". */
export const goalToGo = (d: Drive) => d.firstDownAt >= 100;

export type DownResult = "firstDown" | "nextDown" | "turnover";

/**
 * Where the next play starts after the ball is downed at `end` (the
 * offense's yard line). Reaching the line gives a fresh set of downs;
 * failing on fourth down hands the ball over at the spot.
 */
export function advance(d: Drive, end: number, ballZ: number): { drive: Drive; result: DownResult } {
  const spot = clamp(end, 1, 99);
  if (spot >= d.firstDownAt) return { drive: newDrive(d.offense, spot, ballZ), result: "firstDown" };
  if (d.down >= 4) return { drive: newDrive(other(d.offense), 100 - spot, ballZ), result: "turnover" };
  return { drive: { ...d, los: spot, down: d.down + 1, ballZ }, result: "nextDown" };
}

/** "1st", "2nd", "3rd", "4th", for the scoreboard. */
export function ordinal(down: number): string {
  return down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : `${down}th`;
}

/** The scoreboard's down and distance: "3rd and 4", "1st and goal", "2nd and inches". */
export function downText(d: Drive): string {
  if (d.conversion) return "Try";
  const left = toGo(d);
  const distance = goalToGo(d) ? "goal" : left < 0.5 ? "inches" : String(Math.round(left));
  return `${ordinal(d.down)} and ${distance}`;
}

/** Where a field goal is kicked from: the line plus the snap back plus the ten yard end zone. */
export const fieldGoalYards = (d: Drive) => 100 - d.los + RULES.fgDepth + 10;

export const inFieldGoalRange = (d: Drive) => fieldGoalYards(d) <= RULES.fieldGoalRange;
