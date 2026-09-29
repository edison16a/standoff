import { attackSign, other, type TeamId } from "../teams";
import { gain, goalLineOf, hashZ, ownYardLine, yardsToGoal } from "./field";
import { MATCH } from "./tuning";
import type { Drive, MatchState } from "./types";

/** Ten yards on, or the goal line when that is closer: goal to go. */
export function firstDownLine(team: TeamId, los: number): number {
  if (yardsToGoal(team, los) <= MATCH.firstDown) return goalLineOf(team);
  return los + attackSign(team) * MATCH.firstDown;
}

/** First and ten for a team from a spot. */
export function newDrive(team: TeamId, x: number, z = 0): Drive {
  return { offense: team, los: x, ballZ: hashZ(z), down: 1, firstDown: firstDownLine(team, x) };
}

/** A fresh drive from a team's own yard line, as after a score or at the half. */
export function driveFrom(team: TeamId, ownYards: number): Drive {
  return newDrive(team, ownYardLine(team, ownYards));
}

/** Yards still to go for a first down, rounded as the scoreboard shows them. */
export function toGo(drive: Drive): number {
  return Math.max(1, Math.round(gain(drive.offense, drive.los, drive.firstDown)));
}

/** Goal to go: the first down line is the goal line. */
export function goalToGo(drive: Drive): boolean {
  return drive.firstDown === goalLineOf(drive.offense);
}

export type DownResult = "first" | "next" | "turnover";

/**
 * Moves the chains after a play ends at `x`: a first down if the ball got
 * to the line, else the next down, and after a failed fourth down the
 * ball goes over where it lies.
 */
export function advanceDowns(state: MatchState, x: number, z: number): DownResult {
  const d = state.drive;
  if (gain(d.offense, d.firstDown, x) >= 0) {
    state.drive = newDrive(d.offense, x, z);
    state.events.push({ type: "firstDown", team: d.offense });
    return "first";
  }
  if (d.down >= 4) {
    state.drive = newDrive(other(d.offense), x, z);
    state.events.push({ type: "turnover", team: d.offense, onDowns: true });
    return "turnover";
  }
  state.drive = { ...d, los: x, ballZ: hashZ(z), down: d.down + 1 };
  return "next";
}

/** The label a scoreboard shows: "1st & 10", "3rd & Goal". */
export function downLabel(drive: Drive): string {
  const ord = ["1st", "2nd", "3rd", "4th"][drive.down - 1] ?? `${drive.down}th`;
  return `${ord} & ${goalToGo(drive) ? "Goal" : toGo(drive)}`;
}
