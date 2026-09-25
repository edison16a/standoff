import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { MatchEvent } from "./events";
import type { Rng } from "./rng";
import type { Vec2, Vec3 } from "./vec";

export type AthleteAction = "free" | "shoot" | "pass" | "slide" | "getup" | "stumble" | "hurdle" | "celebrate" | "dejected";

/** What a computer player is thinking. Refreshed a few times a second, not every step. */
export interface Brain {
  thinkIn: number;
  target: Vec2;
  /** Seconds before this player may try another slide or pass. */
  slideWait: number;
  passWait: number;
  /** How long it has dribbled without doing anything else. */
  carried: number;
  /** A player on a phone asked this one for the ball, and how long ago that still counts. */
  caller: number | null;
  callFor: number;
}

export interface AthleteStats {
  goals: number;
  shots: number;
  tackles: number;
  passes: number;
}

export interface Athlete {
  id: number;
  team: TeamId;
  slot: number;
  character: CharacterId;
  /** The phone driving this player, or null for a computer player. */
  seat: number | null;
  /** False while that phone is away. A computer plays for them until it comes back. */
  online: boolean;
  pos: Vec2;
  vel: Vec2;
  /** Radians, 0 facing +x. */
  facing: number;
  action: AthleteAction;
  actionT: number;
  actionLen: number;
  /** The direction of a slide, or of the kick being wound up. */
  actionDir: Vec2;
  /** The run cycle, advanced by distance covered so the feet match the ground. */
  stride: number;
  /** Seconds until this player may touch the ball again. */
  noTouch: number;
  /** Seconds Shoot has been held with the ball. */
  charge: number;
  charging: boolean;
  /** Seconds left on a Shoot press waiting for the ball to arrive. */
  buffered: number;
  /** Who a pass is meant for, while winding up. */
  passTo: number | null;
  /** The pass being wound up goes in the air. */
  lofted: boolean;
  /** Where on the goal line the player pointed a shot, or null to let the game pick. */
  aimZ: number | null;
  /** The stick at a Shoot press made before the ball arrived, for the first time kick. */
  bufferAim: Vec2 | null;
  /** How hard the kick being wound up is, 0 to 1. */
  power: number;
  /** A slide has already met the ball or the man, so it cannot win twice. */
  slideDone: boolean;
  /** 0 to 1, from the roster. */
  speed: number;
  shooting: number;
  strength: number;
  dribbling: number;
  brain: Brain;
  stats: AthleteStats;
}

export type KeeperAction = "set" | "dive" | "catch" | "hold" | "throw" | "getup" | "cheer";

export interface Dive {
  /** Sideways, toward the ball: -1 to the far side, 1 to the near side. */
  dir: -1 | 1;
  fromZ: number;
  /** Where the body ends up. */
  toZ: number;
  /** Where the gloves reach, across and up. */
  gloveZ: number;
  height: number;
  /** Seconds to wait before leaving the ground, and how long the dive takes. */
  wait: number;
  duration: number;
  /** A shot straight at the keeper is taken standing up. */
  standing: boolean;
}

export interface Keeper {
  team: TeamId;
  pos: Vec2;
  vel: Vec2;
  facing: number;
  action: KeeperAction;
  actionT: number;
  dive: Dive | null;
  holdFor: number;
  noTouch: number;
  saves: number;
}

export type ShotOutcome = "goal" | "catch" | "parry" | "post" | "bar" | "over" | "wide";

/** A shot on its way. Its outcome was decided when it was struck and physics plays it out. */
export interface Flight {
  shooter: number;
  team: TeamId;
  outcome: ShotOutcome;
  t: number;
  /** Where the ball crosses the goal line, or the woodwork it is aimed at. */
  target: Vec3;
  /** The line along the pitch where the keeper meets it, for saves. */
  keeperX: number;
  power: number;
  resolved: boolean;
}

export type Owner = { kind: "athlete"; id: number } | { kind: "keeper"; team: TeamId };

export interface Ball {
  pos: Vec3;
  vel: Vec3;
  /** Angular velocity, which curls the ball in flight. */
  spin: Vec3;
  owner: Owner | null;
  lastTouch: { team: TeamId; id: number | null } | null;
  /** The team whose goal the ball is in, once it has gone in. */
  inGoal: TeamId | null;
  /** The player a pass is meant for, so bots run onto it. */
  passTo: number | null;
  /** Seconds since the current owner took it, so a fresh touch cannot be stolen at once. */
  heldFor: number;
}

export type Phase = "kickoff" | "play" | "goal" | "replay" | "restart" | "fulltime";

export interface MatchOptions {
  seed: number;
  seconds: number;
  goalsToWin: number;
  /** Shows a goal replay after each celebration. */
  replays: boolean;
  /** Lets the showcase decide some shots' outcomes. Return null to roll the dice. */
  rig?: (shotNumber: number, team: TeamId) => ShotOutcome | null;
}

export interface MatchState {
  phase: Phase;
  phaseT: number;
  /** Seconds left on the clock. */
  clock: number;
  golden: boolean;
  score: [number, number];
  kickoffTeam: TeamId;
  /** Whose keeper restarts after the ball goes out behind a goal. */
  restartTeam: TeamId | null;
  athletes: Athlete[];
  keepers: [Keeper, Keeper];
  ball: Ball;
  flight: Flight | null;
  winner: TeamId | null;
  lastGoal: { team: TeamId; scorer: number | null } | null;
  rng: Rng;
  /** This step's events, cleared at the start of each step. */
  events: MatchEvent[];
  options: MatchOptions;
  time: number;
  shotCount: number;
}

/** One player's controls for one step, from a phone or a computer brain. */
export interface Command {
  /** Wanted direction on the pitch, length 0 to 1. */
  move: Vec2;
  shootDown?: boolean;
  shootUp?: boolean;
  /** Where the stick pointed when Shoot went down or up, which aims the kick. */
  aim?: Vec2;
  /** Slide in the move direction. Does nothing with the ball at your feet. */
  slide?: boolean;
  /** A computer player's pass, to a team mate it picked. */
  passTo?: number;
  /** A computer player's instant shot, at this power. */
  shoot?: number;
}
