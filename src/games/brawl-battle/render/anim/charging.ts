import { blend, type Pose } from "./pose";
import { beyond, type StrikeAnim } from "./strike";

const smooth = (u: number) => u * u * (3 - 2 * u);

/**
 * The pose held while a charged move winds up. It sinks into the move's
 * wind up as the charge builds, coiling a little past it by full power,
 * breathes deeper and faster as it fills, and trembles near the top as
 * if the body can barely hold it back.
 */
export function chargingPose(anim: StrikeAnim, level: number, time: number, out: Pose): Pose {
  const depth = 0.55 + 0.45 * smooth(level);
  blend(out, beyond(anim.hit, anim.windup, 0.18 * level), depth, out);
  const breath = Math.sin(time * (2.6 + 3.4 * level));
  out.hipY += breath * 0.025 - 0.05 * level;
  out.torsoX += breath * 0.04;
  out.neckX -= breath * 0.03;
  out.armLSpread += breath * 0.05 * (0.5 + level);
  out.armRSpread += breath * 0.05 * (0.5 + level);
  const strain = Math.max(0, level - 0.45) / 0.55;
  out.torsoZ += Math.sin(time * 63) * 0.035 * strain;
  out.hipZ += Math.sin(time * 47) * 0.014 * strain;
  out.torsoY += Math.sin(time * 71) * 0.03 * strain;
  return out;
}
