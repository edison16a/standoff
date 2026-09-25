import type { MatchEvent } from "./events";
import { Match, type MatchOptions } from "./match";
import { defenseOf, type Posture } from "./stance";
import type { FighterId } from "./types";

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

/** A match already past the intro, with both boxers in range and no touching gloves. */
export function fighting(options: Partial<MatchOptions> = {}): Match {
  const match = new Match({ seed: 7, introMs: 2000, touch: false, ...options });
  run(match, 2100);
  return match;
}

/** Holds a boxer in a posture: `{ shell: "guard" }`, `{ duck: 1 }`, `{ slip: -1 }` and so on. */
export function hold(match: Match, id: FighterId, posture: Partial<Posture>): void {
  match.setInput(id, defenseOf(posture));
}

export function ofType<T extends MatchEvent["type"]>(events: MatchEvent[], type: T): Extract<MatchEvent, { type: T }>[] {
  return events.filter((event): event is Extract<MatchEvent, { type: T }> => event.type === type);
}
