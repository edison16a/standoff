import type { BallPath } from "./catch/path";
import type { Flight } from "./flight";
import type { BallState, TeamId } from "./types";
import type { V2, V3 } from "./vec";

/** A pass in the air: who threw it, who it is for, and what has happened to it on the way. */
export interface PassInfo {
  from: number;
  to: number;
  /** A defender who sat in front of the target at the throw: he reads it and breaks on the ball. */
  interceptor: number | null;
  /** Where the throw was aimed to meet the receiver, and when, before the hand's error. */
  spot: V2;
  arrive: number;
  t: number;
  /** Release speed in metres a second and spin in turns a second, for the replay's numbers. */
  speed: number;
  rps: number;
  /** Where the throw left the hand, for tracing it. */
  release: V3;
  /** Match time of the release. */
  at: number;
  /** When each player last had his hands at it: one go each until it is knocked about. */
  tried: Record<number, number>;
  /** The ball's path ahead, for players to read. Traced again after every tip. */
  path: BallPath | null;
  /** Off someone's hands on the way. */
  tipped: boolean;
  /** A short lob back to a runner on a run play, not a forward pass: nobody picks it off. */
  pitch: boolean;
  /** Each defender with a play on the ball when it was thrown, and his threat, 0 to 1 (pass-lane.ts). Nobody else gets one. */
  lane: Record<number, number>;
}

/** A fumble while the ball is loose: who lost it and when. */
export interface FumbleInfo {
  by: number;
  team: TeamId;
  at: number;
}

/**
 * The ball. Held, it rides in the holder's arm and `pos` follows them;
 * free (a snap, pass, kick or loose ball) it is a rigid body on `flight`,
 * and stays one after the whistle, bouncing and rolling to a stop.
 */
export interface Ball {
  state: BallState;
  holder: number | null;
  pos: V3;
  flight: Flight | null;
  pass: PassInfo | null;
  fumble: FumbleInfo | null;
}

export function newBall(): Ball {
  return { state: "dead", holder: null, pos: { x: 0, y: 0.15, z: 0 }, flight: null, pass: null, fumble: null };
}
