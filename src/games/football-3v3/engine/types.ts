import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { V2 } from "./vec";

export type { TeamId };

/** Every team has one QB, up to two runners, and three computer linemen. */
export type Role = "qb" | "runner" | "lineman";

/** Which juke comes out depends on the stick against the run: ahead or none, back, or across. */
export type JukeKind = "spin" | "back" | "side";

/** Buttons on the phones. Guard is held; the rest are presses. */
export const BUTTONS = ["hike", "juke", "dive", "rush", "tackle", "guard", "kick"] as const;
export type Button = (typeof BUTTONS)[number];

/**
 * What a player is busy doing. Every action carries its own clock `t`
 * in seconds and its length `dur`, which the animation reads, so the body
 * and the ball always agree.
 */
export type Action =
  | { kind: "none" }
  /** Set before the snap: linemen and receivers crouched, the QB waiting. */
  | { kind: "stance"; t: number }
  /** `dodge` is the part of the juke, in seconds on `t`, that makes a tackle miss. */
  | { kind: "juke"; t: number; dur: number; juke: JukeKind; side: 1 | -1; dir: V2; speed: number; dodge: [number, number] }
  | { kind: "dive"; t: number; dur: number; dir: V2 }
  | { kind: "lunge"; t: number; dur: number; dir: V2; target: number }
  | { kind: "throw"; t: number; dur: number; released: boolean; to: number }
  | { kind: "kick"; t: number; dur: number; released: boolean }
  /** On the ground, then getting up for the last TACKLE.getUp seconds. */
  | { kind: "down"; t: number; dur: number; cause: "tackled" | "missed" | "whiff" | "dive" | "tackler" }
  | { kind: "celebrate"; t: number; dur: number; spike: boolean };

export type ActionKind = Action["kind"];

export interface Stats {
  passYards: number;
  completions: number;
  attempts: number;
  rushYards: number;
  recYards: number;
  catches: number;
  touchdowns: number;
  tackles: number;
  sacks: number;
  interceptions: number;
  fieldGoals: number;
}

export const emptyStats = (): Stats => ({
  passYards: 0, completions: 0, attempts: 0, rushYards: 0, recYards: 0, catches: 0,
  touchdowns: 0, tackles: 0, sacks: 0, interceptions: 0, fieldGoals: 0,
});

/** What a computer player remembers between thoughts. */
export interface BotMemory {
  /** Seconds until the bot may make its next decision. */
  wait: number;
  /** The route it runs this play, as ground waypoints. */
  route: V2[];
  leg: number;
  /** A curl ends by settling: the receiver stops at the last point instead of running on. */
  stop: boolean;
  /** The last move it chose, held until it thinks again. */
  goal: V2;
  /** The offensive player it covers, or null to rush or play deep. */
  cover: number | null;
  /** With nobody to cover: rush the QB this play, or sit deep as a safety. */
  rush: boolean;
  /** When the QB bot will throw, in seconds after the snap. */
  readAt: number;
}

export interface Athlete {
  id: number;
  team: TeamId;
  role: Role;
  /** 0 to 2 within the role and team, which sets where they line up. */
  slot: number;
  /** Null for linemen, who share one build. */
  character: CharacterId | null;
  number: number;
  /** The phone playing this athlete, or null for a computer player. */
  seat: number | null;
  /** True while the computer plays them: bots, and humans whose phone dropped. */
  auto: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Facing: 0 looks toward +z. */
  yaw: number;
  mass: number;
  /** Where the stick asks to go, in field space, length up to 1. */
  move: V2;
  /** The throw stick, in field space, while it is held. */
  aim: V2 | null;
  action: Action;
  jukeCd: number;
  jukeHeat: number;
  tackleCd: number;
  rushT: number;
  rushCd: number;
  /** The receiver this defender tails while Guard is held. */
  guard: number | null;
  /** Seconds left in contact with an opposing lineman, for slowing and drawing. */
  blocked: number;
  bot: BotMemory;
  stats: Stats;
}

export type BallState = "dead" | "held" | "snap" | "pass" | "kick" | "loose";

export type Phase =
  /** The QB picks kick or throw. */
  | "choose"
  /** Lined up, the hike window running. */
  | "presnap"
  | "live"
  /** The kick meters, then the kick in the air. */
  | "kick"
  /** The whistle after a play, before the next one lines up. */
  | "dead"
  | "touchdown"
  /** After a touchdown: kick for one or go for two. */
  | "convert"
  | "over";

export type PlayCall = "throw" | "kick";
export type ConversionCall = "kick" | "two";
