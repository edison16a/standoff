import type { ConversionCall, JukeKind, PlayCall, TeamId } from "./types";

/** How a play ended, for the whistle, the banner and the replay. */
export type PlayEnd =
  | "tackle"
  | "sack"
  | "out"
  | "incomplete"
  | "touchdown"
  | "safety"
  | "touchback"
  | "dive"
  | "fieldGoal"
  | "missedKick"
  | "punt";

/**
 * Everything worth a sound, an effect, a banner or a buzz. The match
 * queues these as they happen and the host drains them each frame.
 */
export type MatchEvent =
  | { type: "choose"; team: TeamId; qb: number; conversion: boolean }
  | { type: "call"; team: TeamId; call: PlayCall | ConversionCall }
  | { type: "lineUp"; team: TeamId; down: number; toGo: number; yardline: number }
  | { type: "hike"; id: number; auto: boolean }
  /** The rush is on: defenders may cross the line. */
  | { type: "rush"; team: TeamId }
  | { type: "pads"; a: number; b: number; power: number }
  | { type: "juke"; id: number; juke: JukeKind }
  | { type: "dive"; id: number }
  | { type: "lunge"; id: number; target: number }
  | { type: "missedTackle"; id: number; by: number }
  | { type: "tackle"; id: number; by: number; sack: boolean }
  | { type: "throw"; id: number; to: number; speed: number; spin: number; air: number; intercepting: boolean }
  /** The QB's pitch to the back on a run call, and the back taking it. */
  | { type: "pitch"; id: number; to: number }
  | { type: "takePitch"; id: number }
  | { type: "catch"; id: number; yards: number }
  | { type: "intercept"; id: number; from: number }
  | { type: "incomplete"; id: number | null }
  /** A defender knocked the pass down. */
  | { type: "breakUp"; id: number }
  /** The ball came off someone's hands: a drop, a bobble or a tip, still live. */
  | { type: "tip"; id: number }
  /** A big hit jarred the ball out, and whoever got to the loose ball. */
  | { type: "fumble"; id: number }
  | { type: "recover"; id: number; team: TeamId; from: number }
  /** A kick clanged off the posts. */
  | { type: "doink"; part: "upright" | "crossbar"; power: number }
  | { type: "whistle"; end: PlayEnd; yards: number }
  | { type: "firstDown"; team: TeamId }
  | { type: "turnoverOnDowns"; team: TeamId }
  | { type: "meter"; stage: "aim" | "power"; value: number }
  | { type: "kick"; id: number; fieldGoal: boolean; power: number; accuracy: number }
  | { type: "fieldGoal"; team: TeamId; good: boolean; conversion: boolean; yards: number }
  | { type: "punt"; team: TeamId; yards: number }
  | { type: "touchdown"; team: TeamId; id: number; pass: number | null; conversion: boolean }
  | { type: "twoPoint"; team: TeamId; good: boolean }
  | { type: "safety"; team: TeamId }
  | { type: "score"; team: TeamId; points: number; total: [number, number] }
  | { type: "quarterEnd"; quarter: number }
  | { type: "overtime" }
  | { type: "win"; team: TeamId | null };

export type MatchEventType = MatchEvent["type"];
