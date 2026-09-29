import type { TeamId } from "../teams";
import type { JukeKind, KickKind, PlayCall, PlayEnd, ScoreKind } from "./types";
import type { Vec3 } from "./vec";

/**
 * What happened in a step, for the sound, the scoreboard, the camera and
 * the phones' buzzers. The match never waits on any of them.
 */
export type MatchEvent =
  | { type: "whistle" }
  | { type: "call"; team: TeamId; call: PlayCall; kick: KickKind | null; isTry: boolean }
  | { type: "hike"; team: TeamId; auto: boolean }
  /** Linemen meeting at the snap and pads hitting in a tackle, for the pad sound. */
  | { type: "pads"; at: Vec3; hard: boolean }
  | { type: "throw"; athlete: number; target: number; speed: number; spin: number; distance: number }
  | { type: "catch"; athlete: number; team: TeamId }
  | { type: "interception"; athlete: number; team: TeamId; auto: boolean }
  | { type: "tipped"; athlete: number }
  | { type: "incomplete" }
  | { type: "juke"; athlete: number; kind: JukeKind }
  | { type: "dive"; athlete: number }
  | { type: "lunge"; athlete: number }
  /** A tackle attempt met the carrier: made, dodged by a juke, or broken. */
  | { type: "tackle"; athlete: number; carrier: number; result: "made" | "missed" | "broken" }
  | { type: "sack"; athlete: number; qb: number }
  | { type: "out"; athlete: number }
  | { type: "playEnd"; end: PlayEnd; gain: number }
  | { type: "firstDown"; team: TeamId }
  | { type: "turnover"; team: TeamId; onDowns: boolean }
  | { type: "kick"; athlete: number; kind: KickKind; power: number; aim: number }
  | { type: "kickResult"; kind: KickKind; good: boolean; distance: number }
  | { type: "score"; team: TeamId; kind: ScoreKind; points: number; by: number | null }
  | { type: "quarter"; quarter: number; overtime: boolean }
  | { type: "final"; winner: TeamId | null };

export type MatchEventType = MatchEvent["type"];
