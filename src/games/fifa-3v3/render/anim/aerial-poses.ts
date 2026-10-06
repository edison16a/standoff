import { jumpPose } from "./defend-poses";
import { bump, clamp01, smooth } from "./frame";
import { neutral, type Pose } from "./pose";

/**
 * Playing the ball in the air: the header and the chest. The engine
 * plays the ball off the head or chest at the moment the move starts
 * (a nod) or at the top of the leap, so the snap of the neck is drawn
 * there too.
 */

/**
 * A header. In a leap the body rises as the engine has it (the jump's
 * curve), arched back with the arms out for balance, and the neck snaps
 * the forehead through the ball at the top. Standing, it is an arch and
 * a quick nod.
 */
export function headerPose(t: number, length: number): Pose {
  const leap = length > 0.5;
  const p = leap ? jumpPose(t, length, false) : neutral();
  const u = clamp01(t / length);
  // Where the ball is met: the top of a leap, the very start of a nod.
  const hit = leap ? 0.5 : 0.12;
  const arch = smooth(u / hit) * (1 - smooth((u - hit) / 0.12));
  const nod = smooth((u - hit + 0.06) / 0.14) * (1 - smooth((u - hit - 0.2) / 0.35));
  p.spineX = (leap ? 0.05 : 0) - 0.35 * arch + 0.3 * nod;
  p.neckX = -0.45 * arch + 0.5 * nod;
  // Arms out wide and a little forward: balance, and room in the air.
  const arms = leap ? bump(u) : 0.4 * bump(u * 1.5);
  p.shLX = p.shRX = -0.5 * arms;
  p.shLZ = p.shRZ = 0.25 + 0.75 * arms;
  p.elL = p.elR = -0.6 * arms - 0.15;
  return p;
}

/** The chest: leaning back with the arms spread to make a cushion, eyes on the ball as it drops. */
export function chestPose(t: number, length: number): Pose {
  const p = neutral();
  const u = clamp01(t / length);
  const give = bump(u);
  p.spineX = -0.4 * give;
  p.pitch = -0.08 * give;
  p.neckX = 0.45 * give;
  p.shLZ = p.shRZ = 0.2 + 0.7 * give;
  p.shLX = p.shRX = -0.3 * give;
  p.elL = p.elR = -0.2 - 0.7 * give;
  p.kneeL = p.kneeR = 0.15 + 0.3 * give;
  p.hipLX = p.hipRX = -0.1 - 0.15 * give;
  p.lift = -0.04 * give;
  return p;
}
