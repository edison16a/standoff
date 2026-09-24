import { AI_LEVELS, ComputerBoxer, type AiLevel } from "../engine/ai";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { seeded } from "../engine/random";

/** A busier computer boxer than any real round, so a few seconds of footage are full of action. */
const SHOWCASE_LEVEL: AiLevel = { ...AI_LEVELS[2]!, windup: [260, 360], gap: [250, 700], block: 0.35, dodge: 0.25, counter: 0.8, combo: 0.6 };

/**
 * A fight between two computer boxers, for the showcase and the screen
 * behind the menus. Stepped in fixed slices so it plays out the same way
 * however fast the machine draws.
 */
export class DemoFight {
  readonly match: Match;
  private readonly boxers: [ComputerBoxer, ComputerBoxer];
  private carry = 0;

  constructor(seed: number, options: { introMs?: number; roundMs?: number; busy?: boolean } = {}) {
    this.match = new Match({ seed, introMs: options.introMs ?? 600, roundMs: options.roundMs ?? 60_000, rounds: 3, breakMs: 4_000 });
    const random = seeded(seed * 31 + 5);
    const level = options.busy === false ? undefined : () => SHOWCASE_LEVEL;
    this.boxers = [new ComputerBoxer(0, random, level), new ComputerBoxer(1, random, level)];
  }

  /** Moves the fight on by `ms`, and returns what happened. */
  step(ms: number): MatchEvent[] {
    this.carry += Math.min(ms, 250);
    const events: MatchEvent[] = [];
    while (this.carry >= 10) {
      this.carry -= 10;
      for (const boxer of this.boxers) boxer.update(this.match);
      const now = this.match.update(10);
      for (const event of now) for (const boxer of this.boxers) boxer.hear(event, this.match);
      events.push(...now);
    }
    return events;
  }
}
