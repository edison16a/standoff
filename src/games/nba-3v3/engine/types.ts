import type { BuildId } from "../builds";
import type { DunkStyle } from "../roster";
import type { ShotTrack } from "./physics/shot-watch";
import type { Grade, Outcome, ShotKind } from "./shot-model";
import type { ShotFlight } from "./shot-outcome/flight";
import type { ShotPreset } from "./shot-outcome/presets";
import type { V2, V3 } from "./vec";

export type TeamId = 0 | 1;

/** The three buttons on the right of the phone. */
export const BUTTONS = ["shoot", "pass", "defend"] as const;
export type Button = (typeof BUTTONS)[number];

/** The dribble moves, picked by where the stick points against the way to the basket. */
export const DRIBBLE_MOVES = ["stepback", "crossover", "spin", "hesitation", "behindBack"] as const;
export type DribbleMove = (typeof DRIBBLE_MOVES)[number];

/**
 * The layups, each a hand made preset (see `finish/layups.ts`): a finger
 * roll, a reverse, a euro step, an up and under, a scoop, a teardrop,
 * high off the glass, off the wrong foot, a spin, a body shield and a
 * power layup off a jump stop.
 */
export const LAYUPS = ["finger", "reverse", "euro", "upUnder", "scoop", "teardrop", "glass", "wrongFoot", "spin", "shield", "power"] as const;
export type LayupKind = (typeof LAYUPS)[number];

/** The small gestures after a big basket: patting down a smaller man, the sleep sign, the shush, the flex. */
export const GESTURES = ["tooSmall", "sleep", "shush", "flex"] as const;
export type Gesture = (typeof GESTURES)[number];

/**
 * What a player is busy doing. Only "none" and "pass" leave the legs
 * free. Every action carries its own clock `t`, in seconds, which the
 * animation reads, so the body and the ball always agree.
 */
export type Action =
  | { kind: "none" }
  /**
   * A jumper, or a free throw (`free`), which is a set shot with no jump.
   * `step` is the velocity of a stepback hop before the rise, when a
   * defender was right on the shooter, or null for a straight up jumper.
   * `float` marks a floater, let go early on the way up (see `floater.ts`).
   */
  | { kind: "shoot"; t: number; three: boolean; released: boolean; free: boolean; step: V2 | null; float?: boolean }
  /**
   * A layup or a dunk. `takeoff`, `finish` (the ball leaves the hand or is
   * slammed) and `land` are times on `t`; a dunk hangs on the rim for
   * `rimHang` seconds after the slam, and `style` is the dunk thrown.
   * `layup` is how a layup is finished, null for a dunk. `hand` is the
   * finishing hand (1 right, -1 left) and `side` the way a sidestep or a
   * spin goes. The ball rides the hands from `pick` (where it was when
   * the gather began) to `release`, the hand at the rim (see
   * `finish/ball-track.ts`). `hangY` is the body's height hanging on the rim.
   */
  | {
      kind: "drive"; t: number; dunk: boolean; style: DunkStyle | null; layup: LayupKind | null; from: V2; to: V2;
      takeoff: number; finish: number; rimHang: number; land: number; peak: number; released: boolean;
      hand: 1 | -1; side: 1 | -1; pick: V3; release: V3; hangY: number; baseYaw: number;
    }
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
  /**
   * Off balance for `dur`: rocked by a dribble move (no `fall`), knocked
   * down on his backside taking a charge or a bigger man's drive
   * (`back`), or lurching on over the man he ran into (`forward`).
   */
  | { kind: "stumble"; t: number; dur: number; fall?: "back" | "forward" }
  /** After a make: a gesture for a big basket, or the player's own celebration when `gesture` is null. */
  | { kind: "celebrate"; t: number; dur: number; gesture: Gesture | null };

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
  build: BuildId;
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
  /** Where the player is steered, in court space, length up to 1: the stick, or Guard, or the computer. */
  move: V2;
  /** The phone's own stick, kept apart from `move` so Guard knows when the thumb takes over. */
  stick: V2;
  /** Guard is held: shadow the man on defence (see `guard.ts`). */
  guard: boolean;
  /** Where the shadow has got to. It trails the ideal spot, which is how a dribble move leaves it behind. */
  guardAim: V2 | null;
  /** The man Guard locked on to, kept through passes and turnovers until it is let go. */
  guardMan: number | null;
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
  /** A gesture owed for a big basket, played as soon as the feet are down. */
  cheer: Gesture | null;
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
  /** The ending picked at release; a block or a scripted film can still change what really happens. */
  preset: ShotPreset;
  made: boolean;
  /** Set once the points are on the board, so a shot never counts twice. */
  counted: boolean;
  touchedRim: boolean;
  assist: number | null;
  /** How hard the shot was contested as it left the hand, 0 to 1, and how far out it was. */
  contest: number;
  distance: number;
  /** What the ball has touched so far, read live off the physics. */
  track: ShotTrack;
  /** The flight the ending was planned on, with any roll round the ring. */
  flight: ShotFlight;
  /** Defenders who already had their one chance to get a hand on it. */
  rolled: number[];
  /** 0 to 1: how much of a defender's chance to block it the finish took away (a scoop, a reverse). */
  evade: number;
}

export type BallMode = "held" | "flight" | "loose";

/**
 * Whose hand is on the ball, for the renderer: held in the hands, the
 * hand riding it on the push of a dribble, free between the hand and the
 * floor on a dribble, or nobody's (in the air or loose).
 */
export type BallHand = "none" | "held" | "dribble" | "free";

export interface Ball {
  pos: V3;
  vel: V3;
  mode: BallMode;
  holder: number | null;
  /** Seconds since it left the last hand. */
  flightT: number;
  /** What the flight is: a shot, a pass to someone, or a blocked shot. */
  flightKind: "shot" | "pass" | "block" | "dunk" | null;
  passTo: number | null;
  /** Where a pass was thrown to, so the receiver can step to it. */
  aim: V3 | null;
  /** Defenders who already had their one chance at this pass. */
  passRolled: number[];
  shot: ShotInfo | null;
  lastTouch: number | null;
  /** The real spin, radians per second about each axis, kept up to date in the hand, on the dribble and in the air. */
  w: V3;
  hand: BallHand;
  /** The last hard hit on the floor or the iron, for the squash: its speed in metres a second, seconds since, and the surface normal. */
  impact: { power: number; age: number; n: V3 };
  rimCd: number;
}

/**
 * Dead is the break after a basket or a turnover; check is the check up
 * at the top that follows it. Free throws run from the whistle for a
 * foul until the last one leaves the shooter's hand.
 */
export type Phase = "countdown" | "live" | "dead" | "check" | "freeThrow" | "over";
