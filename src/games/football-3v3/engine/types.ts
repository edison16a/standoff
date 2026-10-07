import type { BuildId } from "../builds";
import type { TeamId } from "../teams";
import type { BlockKind } from "./block-preset";
import type { CatchPlan } from "./catch-preset";
import type { PassQuality } from "./pass-meter";
import type { ApproachKind, TackleKind } from "./tackle-preset";
import type { ThrowKind } from "./throw-preset";
import type { V2 } from "./vec";

export type { TeamId };

/** Every team has one QB, up to two runners, and three computer linemen. */
export type Role = "qb" | "runner" | "lineman";

/** Which juke comes out depends on the stick against the run: ahead or none, back, or across. */
export type JukeKind = "spin" | "back" | "side";

/** Buttons on the phones. Guard is held; the rest are presses. */
/** Pass is the QB's pitch to the back on a run call; Run turns the QB into a runner. */
export const BUTTONS = ["hike", "juke", "dive", "rush", "tackle", "guard", "kick", "pass", "run"] as const;
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
  /**
   * `dodge` is the part of the juke, in seconds on `t`, that makes a
   * tackle miss. For the first `plant` seconds a planted foot pushes the
   * body toward `push`, then the run settles back to `dir` at `speed`.
   */
  | { kind: "juke"; t: number; dur: number; juke: JukeKind; side: 1 | -1; dir: V2; speed: number; push: V2; plant: number; dodge: [number, number] }
  | { kind: "dive"; t: number; dur: number; dir: V2 }
  /** `approach` is the tackle preset the lunge was picked as, so the leap already looks like that tackle. */
  | { kind: "lunge"; t: number; dur: number; dir: V2; target: number; approach: ApproachKind }
  /**
   * A forward pass, or with `lob` the pitch to the back on a run call. `quality` is the throw meter's timing,
   * `style` the throwing motion picked for it (throw-preset.ts) and `release` the second the ball leaves the hand.
   */
  | { kind: "throw"; t: number; dur: number; released: boolean; to: number; lob: boolean; quality: PassQuality; style: ThrowKind; release: number }
  | { kind: "kick"; t: number; dur: number; released: boolean }
  /** On the ground, then getting up for the last TACKLE.getUp seconds. `bind` ties the men of one tackle together. */
  | { kind: "down"; t: number; dur: number; cause: DownCause; bind: TackleBind | null }
  | { kind: "celebrate"; t: number; dur: number; spike: boolean };

export type ActionKind = Action["kind"];

/**
 * Why a player went down: tackled with the ball, making the tackle or
 * piling on, a dive, or a miss: dodged by a juke, lunging at nothing,
 * bounced off a carrier who ran through him, or his ankles broken by a
 * juke he never lunged at. A rusher a blocker drove onto his back is pancaked.
 */
export type DownCause = "tackled" | "tackler" | "pile" | "dive" | "missed" | "whiff" | "shed" | "juked" | "pancaked";

/** The men of one tackle, held together through its preset (tackle-bind.ts). */
export interface TackleBind {
  kind: TackleKind;
  role: "carrier" | "tackler" | "pile";
  /** The carrier, for the tackler and the pile; the tackler, for the carrier. */
  partner: number;
  /** The tackle's line on the ground. */
  f: V2;
  /** The side of that line the man came from: 1 on its left. */
  side: 1 | -1;
  /** Where he was from the carrier when they met, along the line and across it, to ease from. */
  from: { along: number; across: number };
}

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
  build: BuildId | null;
  number: number;
  /** The phone playing this athlete, or null for a computer player. */
  seat: number | null;
  /**
   * The phone steering this athlete right now: its own seat, or a phone
   * that gave a computer player the ball and took him over (control.ts).
   */
  pilot: number | null;
  /** True while the computer plays them: bots, players lent to a teammate's phone, and humans whose phone dropped. */
  auto: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** This step's acceleration, for the drawing to lean into cuts and stops. */
  ax: number;
  az: number;
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
  /** Seconds left of shaky footing after a big jolt or a broken tackle. */
  stagger: number;
  /** Fooled by a juke: seconds into it, how long it lasts and which way he lurches, or null. He may be on the turf for it. */
  stumble: { t: number; dur: number; side: 1 | -1 } | null;
  /** His move for a pass coming down, picked before it arrives (catch/plan.ts), or null. */
  catching: CatchPlan | null;
  /** A lineman's block move this play, seconds into it, and which side of it he is on (block-preset.ts), or null. */
  block: { kind: BlockKind; t: number; offense: boolean } | null;
  bot: BotMemory;
  stats: Stats;
}

export type BallState = "dead" | "held" | "snap" | "pass" | "kick" | "loose";

export type Phase =
  /** The QB picks throw, run or kick. */
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

/** Throw, run (the QB pitches to a back beside him) or kick. */
export type PlayCall = "throw" | "run" | "kick";
export type ConversionCall = "kick" | "two";
