/**
 * How a move is written down. Every move is data: a few frames of wind
 * up, hitboxes that are live for a window of frames, then recovery.
 * Offsets are in metres from the fighter's feet, with x toward where
 * they face, so one move works facing either way.
 */

/** Attack 1 on the ground, by the direction held. */
export type LightKey = "jab" | "side" | "up" | "down";
/** Attack 1 in the air. Neutral and side share the aerial. */
export type AirKey = "air" | "airUp" | "airDown";
/** Attack 2, on the ground or in the air. Its up variant is the recovery. */
export type HeavyKey = "heavy" | "heavySide" | "heavyUp" | "heavyDown";
export type MoveKey = LightKey | AirKey | HeavyKey | "ult";

export const MOVE_KEYS: readonly MoveKey[] = ["jab", "side", "up", "down", "air", "airUp", "airDown", "heavy", "heavySide", "heavyUp", "heavyDown", "ult"];

/** Which sound a hit makes, for the host's audio. */
export type HitSound = "punch" | "kick" | "slash" | "magic" | "slam";

export interface Hit {
  damage: number;
  /** Launch speed at 0 percent, and how much each percent of damage adds. */
  base: number;
  growth: number;
  /** Degrees: 0 straight ahead, 90 straight up, -90 straight down (a spike). */
  angle: number;
}

export interface Hitbox extends Hit {
  x: number;
  y: number;
  r: number;
  /** First and last live frame, counted from 1. */
  from: number;
  to: number;
  /** Hitboxes in different groups may each hit the same fighter once, for multi hit moves. */
  group?: number;
}

export interface ProjectileSpec extends Hit {
  /** The frame it is released on. */
  frame: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Frames before it fizzles. */
  life: number;
}

/** A push the fighter gives themselves on a frame, like a lunge or a leap. */
export interface Motion {
  frame: number;
  vx?: number;
  vy?: number;
  /** Replace the velocity instead of adding to it. */
  set?: boolean;
}

export interface Move {
  name: string;
  /** The whole move, in frames. */
  frames: number;
  sound: HitSound;
  /** Heavy moves freeze longer on a hit and shake the screen. */
  heavy?: boolean;
  hitboxes: Hitbox[];
  projectiles?: ProjectileSpec[];
  motion?: Motion[];
  /** Frames where hits land without interrupting the move, from and to. */
  armor?: [number, number];
  /** Frames where nothing can hit the fighter. */
  invincible?: [number, number];
  /** Lag frames if an aerial is still going when the fighter lands. */
  landLag?: number;
  /** A recovery move: once per trip into the air, and no more jumps after it. */
  recovery?: boolean;
  /** Keeps the fighter still in the air while it plays, for moves cast in place. */
  hover?: boolean;
  /** The fighter stops moving on landing a hit, so a rush stays on its target. */
  stopOnHit?: boolean;
  /** Goes through shields. */
  unblockable?: boolean;
}

export type Moveset = Record<MoveKey, Move>;
