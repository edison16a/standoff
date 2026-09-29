import type { TeamId } from "../teams";
import { newDrive } from "./downs";
import type { MatchEvent } from "./events";
import type { Entry } from "./lineup";
import { Match, type MatchOptions } from "./match";
import { startChoose } from "./phases";
import { STEP } from "./tuning";
import type { Athlete } from "./types";

/** Four people and no computer runners, so tests steer every skill player themselves. */
export const PEOPLE: Entry[] = [
  { team: 0, role: "qb", character: "reed", seat: 0 },
  { team: 0, role: "runner", character: "banks", seat: 1 },
  { team: 1, role: "qb", character: "lindqvist", seat: 2 },
  { team: 1, role: "runner", character: "fields", seat: 3 },
];

/** Computer players only: two full teams. */
export const BOTS: Entry[] = [
  { team: 0, role: "qb", character: "reed", seat: null },
  { team: 0, role: "runner", character: "banks", seat: null },
  { team: 0, role: "runner", character: "ortiz", seat: null },
  { team: 1, role: "qb", character: "lindqvist", seat: null },
  { team: 1, role: "runner", character: "fields", seat: null },
  { team: 1, role: "runner", character: "kowalski", seat: null },
];

export function peopleMatch(options: Partial<MatchOptions> = {}): Match {
  return new Match({ entries: PEOPLE, seed: 7, firstOffense: 0, ...options });
}

/** Steps the match for `seconds`, or until `until` holds, collecting events. */
export function run(m: Match, seconds: number, until?: (m: Match) => boolean): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
    if (until?.(m)) break;
  }
  return events;
}

/** Puts the ball at a spot for `team` and lines up for a new play. */
export function setDrive(m: Match, team: TeamId, yardline: number, down = 1): void {
  m.drive = { ...newDrive(team, yardline), down };
  startChoose(m);
  m.drainEvents();
}

/** Picks throw and hikes, then steps until the QB has the ball. */
export function snap(m: Match): void {
  const qb = m.qbOf(m.offense);
  m.choose(qb.id, "throw");
  m.press(qb.id, "hike");
  run(m, 1, () => m.carrier() === qb);
}

export const bySeat = (m: Match, seat: number): Athlete => m.bySeat(seat)!;
