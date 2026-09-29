import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Role } from "../roles";
import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { MatchEvent } from "./events";
import type { Rng } from "./rng";
import type { RouteKind, RouteState } from "./route-types";
import type { Vec2, Vec3 } from "./vec";

export type { RouteKind, RouteState };

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

export type BallMode = "dead" | "held" | "snap" | "spiral" | "kick" | "loose";

export interface Ball {
  pos: Vec3;
  vel: Vec3;
  mode: BallMode;
  holder: number | null;
  /** The long axis, which a good spiral keeps pointed along its path. */
  axis: Vec3;
  /** Spin about the long axis, radians a second, and the roll so far. */
  spinRate: number;
  roll: number;
  /** Nutation wobble of the nose, radians, and its phase. */
  wobble: number;
  wobblePhase: number;
  /** A kick's end over end turn so far. */
  tumble: number;
}

export type PlayCall = "throw" | "kick";
export type KickKind = "fieldgoal" | "punt" | "pat";

/** A pass in the air. */
export interface Pass {
  thrower: number;
  target: number;
  from: Vec3;
  /** Where and when the throw meets the target's run. */
  catchAt: Vec3;
  eta: number;
  t: number;
  /** A defender standing in front of the target, who takes it whatever happens. */
  pickBy: number | null;
  /** Players who have had their chance at it, so nobody rolls twice. */
  tested: number[];
  /** Tipped by a defender: now nobody can catch it. */
  tipped: boolean;
  speed: number;
}

export interface KickState {
  kind: KickKind;
  stage: "aim" | "power" | "windup" | "flight" | "done";
  /** Seconds in the current stage, which drives the bars. */
  t: number;
  aim: number;
  power: number;
  kicker: number;
  spot: Vec2;
  result: "good" | "wide" | "short" | "blocked" | "landed" | "out" | "touchback" | null;
  /** Where a punt first came down. */
  landed: Vec2 | null;
}

/** The team with the ball, where it is and what it needs. */
export interface Drive {
  offense: TeamId;
  /** Line of scrimmage x, and the ball's spot across the field. */
  los: number;
  ballZ: number;
  down: number;
  /** The x of the first down line, at the goal line when goal to go. */
  firstDown: number;
}

export type PlayEnd = "tackle" | "dive" | "out" | "incomplete" | "touchdown" | "safety" | "touchback" | "turnover";

export interface Play {
  call: PlayCall | null;
  /** The play after a touchdown: kick for one or throw for two. */
  isTry: boolean;
  snapped: boolean;
  /** Who has the ball, and the team they play for (an interception flips it). */
  carrier: number | null;
  carrierTeam: TeamId;
  /** Where the carrier got it, for rushing yards. */
  gotAt: number;
  /** The receiver the throw stick is on. */
  target: number | null;
  pass: Pass | null;
  /** A forward pass has been thrown, and caught by this receiver (null if not). */
  thrown: boolean;
  receiver: number | null;
  intercepted: boolean;
  end: PlayEnd | null;
  /** Where the ball is spotted after the whistle. */
  spot: Vec2;
}

export type Phase = "call" | "presnap" | "live" | "kick" | "dead" | "score" | "replay" | "quarter" | "final";

export type ScoreKind = "touchdown" | "fieldgoal" | "pat" | "twopoint" | "safety";

export interface MatchOptions {
  seed: number;
  quarterSeconds: number;
  pointsToWin: number;
  /** Shows a touchdown replay after the celebration. */
  replays: boolean;
  /** How sharp the computer players are. Training leaves them standing still. */
  level: BotLevel;
}

export interface MatchState {
  phase: Phase;
  phaseT: number;
  quarter: number;
  /** Seconds left in the quarter. It runs only while the ball is live. */
  clock: number;
  /** Tied after four quarters: the next score wins. */
  overtime: boolean;
  score: [number, number];
  drive: Drive;
  play: Play;
  /** The team that had the ball first, so the other starts the second half. */
  openedBy: TeamId;
  athletes: Athlete[];
  linemen: Lineman[];
  ball: Ball;
  kick: KickState | null;
  winner: TeamId | null;
  lastScore: { team: TeamId; kind: ScoreKind; by: number | null; thrower: number | null } | null;
  rng: Rng;
  /** This step's events, cleared at the start of each step. */
  events: MatchEvent[];
  options: MatchOptions;
  time: number;
}

/** One player's controls for one step, from a phone or a computer brain. Directions are on the field. */
export interface Command {
  /** Wanted run direction, length 0 to 1. */
  move: Vec2;
  /** The throw stick, length 0 to 1, or null when it is let go. */
  aim?: Vec2 | null;
  /** The throw stick was let go after aiming: throw to the lit receiver. */
  throw?: boolean;
  juke?: boolean;
  dive?: boolean;
  tackle?: boolean;
  /** Held buttons, sent as levels. */
  rush?: boolean;
  guard?: boolean;
  hike?: boolean;
  call?: PlayCall;
  /** Where the phone stopped each kicking bar: accuracy -1 to 1, then power 0 to 1. */
  kickAim?: number;
  kickPower?: number;
}
