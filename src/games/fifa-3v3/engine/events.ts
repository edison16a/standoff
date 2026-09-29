import type { TeamId } from "../teams";
import type { SetPieceKind, ShotOutcome, SkillKind } from "./types";
import type { Vec2, Vec3 } from "./vec";

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
  | { type: "skill"; athlete: number; kind: SkillKind }
  /** A skill move met a defender: beat them, or gave the ball away. */
  | { type: "skillResult"; athlete: number; defender: number; result: "beat" | "lost" }
  | { type: "throw"; team: TeamId }
  /** The referee gives a foul: a free kick or a penalty to `team`. */
  | { type: "foul"; offender: number; victim: number; team: TeamId; kind: SetPieceKind; at: Vec2 }
  /** The yellow card goes up. For show: nobody is sent off. */
  | { type: "card"; offender: number }
  /** The kick is lined up and the taker may go. */
  | { type: "setpiece"; kind: SetPieceKind; team: TeamId; taker: number }
  /** A defender's body, or the wall, got in the way of the ball. */
  | { type: "block"; athlete: number; speed: number; at: Vec3 }
  | { type: "steal"; athlete: number; victim: number; won: boolean }
  | { type: "jump"; athlete: number }
  | { type: "golden" }
  | { type: "fulltime"; winner: TeamId | null };

export type MatchEventType = MatchEvent["type"];
