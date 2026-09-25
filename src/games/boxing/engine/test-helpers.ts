import type { MatchEvent } from "./events";
import { Match, type MatchOptions } from "./match";
import { NO_DEFENSE, type DefenseInput, type FighterId } from "./types";

/** Runs a match for a while in small steps and collects what happened. For tests. */
export function run(match: Match, ms: number, step = 16, each?: (events: MatchEvent[]) => void): MatchEvent[] {
  const all: MatchEvent[] = [];
  for (let t = 0; t < ms; t += step) {
    const events = match.update(step);
    each?.(events);
    all.push(...events);
  }
  return all;
}

/** A match already past the intro, with both boxers in range. */
export function fighting(options: Partial<MatchOptions> = {}): Match {
  const match = new Match({ seed: 7, introMs: 2000, ...options });
  run(match, 2100);
  return match;
}

export function hold(match: Match, id: FighterId, input: Partial<DefenseInput>): void {
  match.setInput(id, { ...NO_DEFENSE, ...input });
}

export function ofType<T extends MatchEvent["type"]>(events: MatchEvent[], type: T): Extract<MatchEvent, { type: T }>[] {
  return events.filter((event): event is Extract<MatchEvent, { type: T }> => event.type === type);
}
