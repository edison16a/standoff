import type { Vec2 } from "./geometry";

/**
 * The handful of numbers that describe a body position, seen from the
 * side: x toward the opponent, y up from the floor, metres. The 3D body
 * rig solves every joint from these (knees and elbows by inverse
 * kinematics), so a pose stays small enough to blend field by field.
 */
export interface Pose {
  /** Pelvis position relative to the fencer's floor origin. */
  hips: Vec2;
  /** Torso tilt away from vertical. Positive leans toward the opponent. */
  lean: number;
  /**
   * How far the chest is turned side on, radians. En garde the sword
   * shoulder leads, which makes a fencer a narrow target.
   */
  twist: number;
  /** Extra nod of the head on top of the lean. */
  nod: number;
  /** Where each foot touches (or hovers over) the floor. */
  frontFoot: Vec2;
  backFoot: Vec2;
  /** Sword hand, relative to the sword shoulder. */
  hand: Vec2;
  /** Blade elevation, radians from horizontal. */
  bladeAngle: number;
  /** Blade swing toward (positive) or away from the camera, radians. */
  bladeYaw: number;
  /** Wrist twist around the blade. */
  wrist: number;
  /** Free hand, relative to the back shoulder. */
  backHand: Vec2;
}
