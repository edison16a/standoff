import type { ArenaEvent, MatchEvent } from "../engine/events";

/**
 * What the session needs from the canvas: turn cuts into pictures, show
 * the points, throw confetti. The canvas component provides it while it
 * is mounted.
 */
export interface Screen {
  react(event: ArenaEvent): void;
  score(event: Extract<MatchEvent, { type: "score" }>): void;
  celebrate(colors: string[]): void;
  calm(): void;
  /** Clears fruit, halves and effects for a fresh round. */
  reset(): void;
}
