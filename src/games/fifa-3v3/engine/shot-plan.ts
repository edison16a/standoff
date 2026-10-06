import type { TeamId } from "../teams";
import { CHARGE } from "./charge";
import { goalX, shotAngle } from "./goal";
import { PITCH } from "./tuning";
import { clamp01, type Vec2 } from "./vec";

/** Inside the post by this much, so a placed shot still clears the keeper's hand and the woodwork. */
const POST_IN = 0.8;
/** A keeper this far across has already covered that post. */
const COVERED = 0.7;

/**
 * Where a held shot goes when the player leaves it to the game, like a
 * striker picking a corner. From one side it goes across to the far
 * post, unless the keeper has already shaded over there, then the near
 * post he left open. Straight on it goes away from the keeper.
 */
export function autoAimZ(shooter: Vec2, keeper: Vec2): number {
  const post = PITCH.goalHalfWidth - POST_IN;
  const from = Math.abs(shooter.z) > 1.2 ? Math.sign(shooter.z) : 0;
  if (from !== 0) {
    const far = -from;
    const keeperAtFar = keeper.z * far > COVERED;
    return (keeperAtFar ? from : far) * post;
  }
  const open = Math.abs(keeper.z) < 0.2 ? (shooter.z >= 0 ? -1 : 1) : -Math.sign(keeper.z);
  return open * post;
}

/**
 * The sidespin a shot gets by itself. From a wide angle toward the far
 * post it is a curler: struck outside the keeper's reach and bending
 * back in toward the shooter's side. Near post and straight on shots are
 * driven with only a little swerve. Better finishers bend it more.
 * Returns spin about the vertical axis for a ball heading along `dirX`.
 */
export function autoCurl(shooter: Vec2, aimZ: number, defending: TeamId, shooting: number): number {
  const dirX = Math.sign(goalX(defending) - shooter.x) || 1;
  const from = Math.sign(shooter.z) || 1;
  const farPost = aimZ * from < 0;
  const angle = shotAngle(shooter, defending);
  // Curl pays off from about 15 degrees out, most from 35 or wider.
  const wide = clamp01((angle - 0.25) / 0.35);
  const amount = farPost ? wide * (5 + 9 * shooting) : 1.5 * wide;
  // The magnus push is spin crossed with velocity: for a ball going along +x, positive spin bends it to -z.
  const bendToward = farPost ? from : -from;
  return -bendToward * dirX * amount;
}

/**
 * How high a shot crosses the line, from the charge bar alone. Green is
 * placed low, yellow is driven at mid height, and red goes for the top
 * corner. Only red can clear the bar: the shot model rolls that.
 */
export function shotHeight(power: number, roll: number): number {
  const top = PITCH.goalHeight - 0.32;
  if (power < CHARGE.yellow) return 0.22 + roll * 0.55;
  if (power < CHARGE.red) return 0.55 + roll * 0.8;
  return 1.3 + roll * (top - 1.3);
}

/** How deep into the red zone the bar went, 0 below it and 1 at full. */
export function redness(power: number): number {
  return clamp01((power - CHARGE.red) / (1 - CHARGE.red));
}
