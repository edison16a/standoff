import type { BodyKind } from "./fruit-kinds";
import type { Vec2 } from "./geometry";

export type Seat = number;

/** Something in flight: a fruit or a bomb. Positions and speeds are in world units. */
export interface Body {
  id: number;
  kind: BodyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Cuts still needed. Only big fruit start above one. */
  hitsLeft: number;
  hits: number;
  /** Seconds a struck big fruit still ignores the blade. */
  cooldown: number;
  /** Seats whose blade is still inside it since their last hit. A blade must leave before it can hit again. */
  touching: Seat[];
  /** Tumble speed around each axis in radians per second. Only the renderer uses it. */
  spin: { x: number; y: number; z: number };
}

export type ScoreReason = "fruit" | "rare" | "hit" | "burst" | "bomb" | "combo";

/**
 * What happened in one step, for the screen, the sound and the phones.
 * The arena reports cuts. The match adds scores and phases on top.
 */
export type ArenaEvent =
  | { type: "spawn"; body: Body }
  /** A fruit cut clean in two. `dir` is the blade's direction, `at` where it met the fruit. */
  | { type: "slice"; seat: Seat; body: Body; dir: Vec2; at: Vec2 }
  /** A big fruit struck but still whole. */
  | { type: "hit"; seat: Seat; body: Body; dir: Vec2; at: Vec2 }
  /** A big fruit's last hit. */
  | { type: "burst"; seat: Seat; body: Body; dir: Vec2; at: Vec2 }
  | { type: "bomb"; seat: Seat; body: Body; at: Vec2 }
  /** Fell off the screen without being cut. */
  | { type: "gone"; id: number }
  /** A blade just started a fast swipe. */
  | { type: "swipe"; seat: Seat; at: Vec2; speed: number };

export type MatchPhase = "countdown" | "playing" | "ending" | "over";

export type MatchEvent =
  | ArenaEvent
  | { type: "score"; seat: Seat; delta: number; total: number; reason: ScoreReason; at: Vec2; count?: number }
  | { type: "phase"; phase: MatchPhase }
  /** A bomb stunned this blade. */
  | { type: "stun"; seat: Seat; seconds: number };
