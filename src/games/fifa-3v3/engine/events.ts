import type { TeamId } from "../teams";
import type { ShotOutcome } from "./types";
import type { Vec3 } from "./vec";

/**
 * What happened in a step, for the sound, the banners, the effects and
 * the phones' buzzers. The match never waits on any of them.
 */
export type MatchEvent =
  | { type: "whistle"; long: boolean }
  | { type: "kickoff"; team: TeamId }
  | { type: "shot"; athlete: number; team: TeamId; outcome: ShotOutcome; power: number; distance: number }
  | { type: "pass"; athlete: number; to: number | null; air: boolean }
  | { type: "control"; athlete: number; team: TeamId; from: TeamId | null }
  | { type: "goal"; team: TeamId; scorer: number | null; golden: boolean }
  | { type: "save"; team: TeamId; kind: "catch" | "parry" | "claim"; at: Vec3 }
  | { type: "woodwork"; part: "post" | "bar"; speed: number; at: Vec3 }
  | { type: "net"; team: TeamId; speed: number; at: Vec3 }
  | { type: "board"; speed: number; at: Vec3 }
  | { type: "bounce"; speed: number }
  | { type: "out"; team: TeamId }
  /** A shot by `team` that missed the target: over the bar, or wide of the posts. */
  | { type: "miss"; team: TeamId; kind: "over" | "wide" }
  | { type: "slide"; athlete: number }
  | { type: "tackle"; athlete: number; victim: number | null; won: boolean }
  | { type: "stumble"; athlete: number }
  | { type: "throw"; team: TeamId }
  | { type: "golden" }
  | { type: "fulltime"; winner: TeamId | null };

export type MatchEventType = MatchEvent["type"];
