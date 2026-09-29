import type { Role } from "../roles";
import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { RouteState } from "./route-types";
import type { Vec2 } from "./vec";

export type AthleteAction =
  /** Set before the snap. */
  | "stance"
  | "free"
  | "juke"
  | "dive"
  /** A tackle lunge at the carrier. */
  | "lunge"
  /** On the grass after a tackle, a whiff or a dive, getting up at the end. */
  | "down"
  | "throw"
  | "kick"
  | "celebrate"
  | "dejected";

/** Forward or no stick spins, back is a back move, to either side a side step. */
export type JukeKind = "spin" | "back" | "side";

/** Why a player is on the grass, which the renderer shows differently. */
export type DownKind = "tackled" | "missed" | "dive" | "broken";

export interface JukeState {
  kind: JukeKind | null;
  /** The side a side step or back move goes, against the run: +1 to the left of it. */
  side: 1 | -1;
  /** The run direction when the move started. */
  dir: Vec2;
  /** Seconds before another juke. */
  wait: number;
  /** Builds with each juke and cools off: spamming slows the moves and the run. */
  heat: number;
}

/** What a computer player is thinking, refreshed a few times a second. */
export interface Brain {
  thinkIn: number;
  target: Vec2;
  /** Seconds before this bot may act on something new, from its reaction time. */
  react: number;
  /** A computer quarterback's plan: when it throws, or when it gives up and runs. */
  throwAt: number;
  /** The quarterback has given up on the pass and tucked it to run. */
  scramble: boolean;
}

export interface AthleteStats {
  passYards: number;
  rushYards: number;
  recYards: number;
  touchdowns: number;
  tackles: number;
  interceptions: number;
  sacks: number;
  attempts: number;
  completions: number;
  catches: number;
}

export interface Athlete {
  id: number;
  team: TeamId;
  role: Role;
  character: CharacterId;
  /** The phone playing them, or null for a computer player. */
  seat: number | null;
  /** False while that phone is away. A computer plays for them until it comes back. */
  online: boolean;
  pos: Vec2;
  vel: Vec2;
  /** Radians, 0 facing +x. */
  facing: number;
  mass: number;
  action: AthleteAction;
  actionT: number;
  actionLen: number;
  /** The direction of a dive or lunge. */
  actionDir: Vec2;
  downKind: DownKind;
  juke: JukeState;
  /** The run cycle, advanced by ground covered so feet never skate. */
  stride: number;
  /** Seconds before another tackle press. */
  tackleWait: number;
  /** Holding Guard: tailing the marked runner. Guarding players never intercept. */
  guard: { held: boolean; mark: number | null };
  /** Holding Rush: through the line more easily. */
  rush: boolean;
  /** Seconds tied up with a blocker, and whether he has shed the block and is through. */
  block: { held: number; through: boolean };
  route: RouteState | null;
  /** 0 to 1, from the roster. */
  speed: number;
  strength: number;
  agility: number;
  arm: number;
  hands: number;
  brain: Brain;
  stats: AthleteStats;
}

export type LinemanAction = "stance" | "engage" | "block" | "celebrate";

/** One of the six computer linemen, three a side, who fight at the line. */
export interface Lineman {
  id: number;
  team: TeamId;
  /** -1, 0 or 1 across the line, matching the opposite lineman. */
  lane: number;
  pos: Vec2;
  vel: Vec2;
  facing: number;
  action: LinemanAction;
  actionT: number;
  /** The rusher this offensive lineman has picked up, if any. */
  blocking: number | null;
  /** The current surge, -1 to 1: positive drives toward the offence's backfield. */
  surge: number;
}
