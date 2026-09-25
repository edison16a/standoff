import type { FighterId, Hand, Level, PunchStyle } from "./types";

export type Method = "KO" | "TKO" | "Decision" | "Draw";

export interface MatchResult {
  /** Null for a draw. */
  winner: FighterId | null;
  method: Method;
  round: number;
  /** Seconds into the round the fight ended, for a stoppage. */
  second: number;
  /** Each round's score, 10 to the winner of the round. */
  cards: [number, number][];
  totals: [number, number];
}

interface PunchFacts {
  fighter: FighterId;
  hand: Hand;
  style: PunchStyle;
  level: Level;
}

/**
 * Everything that happens in a fight, on the tick it happens. Sound, the
 * picture and the overlay all react to these, so they always agree.
 */
export type MatchEvent =
  | { type: "intro" }
  | { type: "bell"; kind: "start" | "end" | "final" }
  | { type: "round"; round: number }
  /** The boxers touched gloves before a round, or the referee waved them on after waiting. */
  | { type: "touch"; timedOut: boolean }
  | { type: "warning" }
  /** A punch leaves. `windupMs` is how long it is telegraphed first, 0 for a player's. */
  | ({ type: "throw"; windupMs: number; impactAt: number; counter: boolean; tired: boolean } & PunchFacts)
  /** `stagger` is a stun. `cover` is how much the gloves were in the way, 0 for a clean shot. */
  | ({ type: "hit"; target: FighterId; damage: number; counter: boolean; heavy: boolean; stagger: boolean; power: number; cover: number } & PunchFacts)
  | ({ type: "block"; target: FighterId } & PunchFacts)
  | ({ type: "miss"; target: FighterId; dodge: "duck" | "slip" | null } & PunchFacts)
  /** A punch that never landed because its thrower was hit first. */
  | ({ type: "interrupted" } & PunchFacts)
  | { type: "counter"; fighter: FighterId; from: "block" | "dodge" }
  | { type: "knockdown"; fighter: FighterId; by: FighterId; knockdowns: number }
  | { type: "count"; fighter: FighterId; count: number }
  | { type: "rise"; fighter: FighterId }
  | { type: "resume" }
  | { type: "stoppage"; fighter: FighterId; by: FighterId; method: "KO" | "TKO" }
  | { type: "over"; result: MatchResult };

export type MatchEventType = MatchEvent["type"];
