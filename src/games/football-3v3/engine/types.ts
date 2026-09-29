import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { TeamId } from "../teams";
import type { Athlete, Lineman } from "./athlete-types";
import type { MatchEvent } from "./events";
import type { Rng } from "./rng";
import type { RouteKind, RouteState } from "./route-types";
import type { Vec2, Vec3 } from "./vec";

export type { RouteKind, RouteState };
export * from "./athlete-types";


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

/** The scorer's touchdown celebration, picked when he scores so every screen shows the same one. */
export type Celebration = "spike" | "dance";

export interface LastScore {
  team: TeamId;
  kind: ScoreKind;
  by: number | null;
  thrower: number | null;
  celebration: Celebration | null;
}

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
  lastScore: LastScore | null;
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
