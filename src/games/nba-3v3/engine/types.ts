import type { CharacterId, DunkStyle } from "../roster";
import type { Flight } from "./flight";
import type { Grade, Outcome, ShotKind } from "./shot-model";
import type { V2, V3 } from "./vec";

export type TeamId = 0 | 1;

/** The three buttons on the right of the phone. */
export const BUTTONS = ["shoot", "pass", "defend"] as const;
export type Button = (typeof BUTTONS)[number];

/** The dribble moves, picked by where the stick points against the way to the basket. */
export const DRIBBLE_MOVES = ["stepback", "crossover", "spin", "hesitation", "behindBack"] as const;
export type DribbleMove = (typeof DRIBBLE_MOVES)[number];

/**
 * What a player is busy doing. Only "none" and "pass" leave the legs
 * free. Every action carries its own clock `t`, in seconds, which the
 * animation reads, so the body and the ball always agree.
 */
export type Action =
  | { kind: "none" }
  /** A jumper, or a free throw (`free`), which is a set shot with no jump. */
  | { kind: "shoot"; t: number; three: boolean; released: boolean; free: boolean }
  /**
   * A layup or a dunk. `takeoff`, `finish` (the ball leaves the hand or is
   * slammed) and `land` are times on `t`; a dunk hangs on the rim for
   * `rimHang` seconds after the slam, and `style` is the dunk thrown.
   */
  | { kind: "drive"; t: number; dunk: boolean; style: DunkStyle | null; from: V2; to: V2; takeoff: number; finish: number; rimHang: number; land: number; peak: number; released: boolean }
  | { kind: "pass"; t: number }
  /** A jump with the arms up: a crouch for `gather` seconds, then `air` seconds off the floor. */
  | { kind: "block"; t: number; peak: number; gather: number; air: number }
  /**
   * A dribble move lasting `dur`. `side` is the hand the ball ends in or
   * the way the move goes, `dir` the way the move carries the player, and
   * `resolved` is set once it has been checked against the defender.
   */
  | { kind: "move"; t: number; move: DribbleMove; dur: number; side: 1 | -1; dir: V2; resolved: boolean }
  /** A swipe at the ball of `victim`, the defender's `attempt`th on them this possession. */
  | { kind: "steal"; t: number; resolved: boolean; victim: number; attempt: number }
  | { kind: "stumble"; t: number; dur: number }
  | { kind: "celebrate"; t: number; dur: number };

export interface BoxScore {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  made: number;
  attempts: number;
  threes: number;
  dunks: number;
  freeMade: number;
  freeAttempts: number;
}

export interface Athlete {
  id: number;
  team: TeamId;
  /** 0 to 2 within the team, which sets where they line up. */
  slot: number;
  character: CharacterId;
  /** The phone playing this athlete, or null for a computer player. */
  seat: number | null;
  /** True while the computer plays them: every computer player, and humans whose phone dropped. */
  auto: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Feet off the floor, in metres. */
  y: number;
  /** Facing: 0 looks toward the camera, pi toward the hoop. */
  yaw: number;
  /** Where the stick asks to go, in court space, length up to 1. */
  move: V2;
  action: Action;
  stealCd: number;
  blockCd: number;
  grabCd: number;
  /** Off balance after a whiffed steal or a dribble move that beat them. */
  whiff: number;
  squeakCd: number;
  /** Seconds left of a planted foot in a hard cut, for the legs to show it. */
  plant: number;
  /** Seconds left gathering after a landing, when the legs are slow. */
  recover: number;
  /** Until the next dribble move. */
  moveCd: number;
  /** How hard the dribble moves have come lately; spamming them loses the ball. */
  moveHeat: number;
  /** Makes in a row. Three is heating up, four is on fire. */
  streak: number;
  onFire: boolean;
  /** 0 to 1 through the dribble; the ball hits the floor as it wraps. */
  dribble: number;
  /** The dribbling hand, right (1) or left (-1). */
  dribbleHand: 1 | -1;
  /** Where the ball is dribbled across the body, -1 left to 1 right, easing over during a crossover. */
  dribbleSide: number;
  crossCd: number;
  /** False from a change of hands until the ball is back in the hand, so the cross goes on the next push down. */
  crossArmed: boolean;
  /** Seconds the ball stays in the hand rather than bouncing: the pocket after a catch, or the pull through a spin. */
  pocket: number;
  /** When they last asked for the ball, in match seconds. */
  calledAt: number;
  box: BoxScore;
}

export interface ShotInfo {
  shooter: number;
  team: TeamId;
  points: 1 | 2 | 3;
  kind: ShotKind;
  /** The dunk thrown, for a dunk. */
  dunk: DunkStyle | null;
  grade: Grade;
  outcome: Outcome;
  made: boolean;
  /** Set once the points are on the board, so a shot never counts twice. */
  counted: boolean;
  touchedRim: boolean;
  assist: number | null;
}

export type BallMode = "held" | "flight" | "loose";

export interface Ball {
  pos: V3;
  vel: V3;
  mode: BallMode;
  holder: number | null;
  flight: Flight | null;
  flightT: number;
  flightSeg: number;
  /** What the flight is: a shot, a pass to someone, or a blocked shot. */
  flightKind: "shot" | "pass" | "block" | "dunk" | null;
  passTo: number | null;
  /** Defenders who already had their one chance at this pass. */
  passRolled: number[];
  shot: ShotInfo | null;
  lastTouch: number | null;
  /** Spin for drawing, radians per second around the axis the flight gives it. */
  spin: number;
  rimCd: number;
}

/**
 * Dead is the break after a basket or a turnover; check is the check up
 * at the top that follows it. Free throws run from the whistle for a
 * foul until the last one leaves the shooter's hand.
 */
export type Phase = "countdown" | "live" | "dead" | "check" | "freeThrow" | "over";
