import type { TeamId } from "../teams";
import type { FoulKind, SetPieceKind, ShotOutcome, SkillKind } from "./types";
import type { Vec3 } from "./vec";

/**
 * What happened in a step, for the sound, the score bug, the effects and
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
  /** A foul: the referee's whistle. `penalty` when it was inside the box. */
  | { type: "foul"; by: number; victim: number; kind: FoulKind; penalty: boolean; at: Vec3 }
  /** The referee holds up the yellow card. */
  | { type: "card"; athlete: number }
  /** A free kick or penalty is set up and waiting for the taker. */
  | { type: "setpiece"; kind: SetPieceKind; team: TeamId; taker: number }
  /** The free kick wall leaps as the kick is struck. */
  | { type: "wallJump"; team: TeamId }
  | { type: "steal"; athlete: number; victim: number; won: boolean }
  | { type: "jump"; athlete: number }
  /** The ball struck a body in its path and flew off it. */
  | { type: "block"; athlete: number; speed: number; at: Vec3 }
  | { type: "golden" }
  | { type: "fulltime"; winner: TeamId | null };

export type MatchEventType = MatchEvent["type"];
