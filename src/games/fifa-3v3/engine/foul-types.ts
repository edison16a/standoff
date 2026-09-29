import type { TeamId } from "../teams";
import type { Vec2 } from "./vec";

/** How the foul was given away: a slide, a steal, a jump into the man, or a test from the admin panel. */
export type FoulKind = "slide" | "steal" | "jump" | "admin";

export interface Foul {
  by: number;
  victim: number;
  /** Where it happened, which decides free kick or penalty. */
  at: Vec2;
  kind: FoulKind;
  penalty: boolean;
  /** The side that was fouled, who take the set piece. */
  team: TeamId;
  /** The referee has held up the yellow card. */
  carded: boolean;
}

export type SetPieceKind = "free" | "penalty";

/**
 * The taker's controls go in stages. A free kick: shift the aim, bend
 * the curve, then hold for power. A penalty: aim at the goal, then power.
 */
export type SetPieceStage = "aim" | "curve" | "power" | "struck";

export interface SetPiece {
  kind: SetPieceKind;
  /** The side taking it. */
  team: TeamId;
  taker: number;
  spot: Vec2;
  stage: SetPieceStage;
  stageT: number;
  /**
   * A free kick: the turn off the line to the middle of the goal, in
   * radians, positive to the taker's right. A penalty: across the goal
   * mouth in metres, positive to the taker's right.
   */
  aimX: number;
  /** A penalty: the height aimed at, in metres. */
  aimY: number;
  /** Bend from -1 (to the taker's left) to 1 (right). */
  curve: number;
  /** Seconds the power button has been held, while it is. */
  charge: number;
  charging: boolean;
  power: number;
  /** The defenders in the wall, shoulder to shoulder. */
  wall: number[];
  /** Shoot went down in this stage, so letting go of it moves on. */
  armed: boolean;
  /** The ball has left the boot. Before that, in the "struck" stage, the taker runs up. */
  launched: boolean;
  /** Seconds since the kick, while the camera stays with it. */
  struckT: number;
}

export type RefereeAction = "follow" | "run" | "card";

/** The referee, who follows play and books the offender. */
export interface Referee {
  pos: Vec2;
  vel: Vec2;
  facing: number;
  stride: number;
  action: RefereeAction;
  actionT: number;
}
