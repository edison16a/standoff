import type { TeamId } from "../teams";
import type { Vec2, Vec3 } from "./vec";

export type SetPieceKind = "free" | "penalty";

/** A foul given by the referee: who, where, and the kick it earns. */
export interface Foul {
  offender: number;
  victim: number;
  /** The side awarded the kick. */
  team: TeamId;
  kind: SetPieceKind;
  at: Vec2;
}

/**
 * The taker's steps. A free kick: aim left and right, then the curve,
 * then the power. A penalty: aim at a spot on the goal, then the power.
 * The run up plays out once the power is set.
 */
export type SetStage = "aim" | "curve" | "power" | "runup";

export interface SetPiece {
  kind: SetPieceKind;
  /** The side taking it. */
  team: TeamId;
  taker: number;
  /** Where the ball sits. */
  spot: Vec2;
  stage: SetStage;
  /** Seconds in this stage, and since the set piece was lined up. */
  stageT: number;
  t: number;
  /** A free kick's direction, in radians off straight at the middle of the goal. */
  aim: number;
  /** A free kick's bend: -1 hard to the left to 1 hard to the right, from the taker's view. */
  curve: number;
  /** A penalty's spot on the goal: across (z) and up (y). */
  target: { y: number; z: number };
  /** Shoot held for the power, on the phone's clock when it says, in seconds. */
  held: number;
  holding: boolean;
  /** The power the bar was stopped at, 0 to 1. */
  power: number;
  /** The defenders in the wall, from one end to the other. */
  wall: number[];
  /** The line the kick would take at a medium strike, for the white guide over the pitch. */
  path: Vec3[];
}

export type RefereeAction = "follow" | "run" | "card" | "point";

/** The referee: follows play along the far side, runs in for a foul and shows the card. */
export interface Referee {
  pos: Vec2;
  vel: Vec2;
  facing: number;
  action: RefereeAction;
  actionT: number;
  /** The run cycle, advanced by distance covered like the players'. */
  stride: number;
  /** Where the run in heads, and who the card is for. */
  target: Vec2 | null;
  cardTo: number | null;
}
