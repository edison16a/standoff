import type { CharacterId } from "../roster";
import type { Flight } from "./flight";
import type { Grade, Outcome, ShotKind } from "./shot-model";
import type { V2, V3 } from "./vec";

export type TeamId = 0 | 1;

/** The three buttons on the right of the phone. */
export const BUTTONS = ["shoot", "pass", "defend"] as const;
export type Button = (typeof BUTTONS)[number];

/** What a player is busy doing. Only "none" and "pass" leave the legs free. */
export type Action =
  | { kind: "none" }
  | { kind: "shoot"; t: number; three: boolean; released: boolean }
  | { kind: "drive"; t: number; dunk: boolean; from: V2; to: V2; takeoff: number; finish: number; land: number; peak: number; released: boolean }
  | { kind: "pass"; t: number }
  | { kind: "block"; t: number; peak: number }
  | { kind: "steal"; t: number; resolved: boolean }
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
  /** Off balance after a whiffed steal. */
  whiff: number;
  squeakCd: number;
  /** Makes in a row. Three is heating up, four is on fire. */
  streak: number;
  onFire: boolean;
  /** 0 to 1 through the dribble; the ball hits the floor as it wraps. */
  dribble: number;
  /** When they last asked for the ball, in match seconds. */
  calledAt: number;
  box: BoxScore;
}

export interface ShotInfo {
  shooter: number;
  team: TeamId;
  points: 2 | 3;
  kind: ShotKind;
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

/** Dead is the break after a basket or a turnover; check is the check up at the top that follows it. */
export type Phase = "countdown" | "live" | "dead" | "check" | "over";
