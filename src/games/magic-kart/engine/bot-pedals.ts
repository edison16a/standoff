import { baseTop } from "./drive";
import type { Kart } from "./kart";
import type { Track } from "./track";
import { DRIFT } from "./tuning";

/** Sideways grip a computer driver trusts before slowing for a bend, m/s². */
const CORNER_GRIP = 24;
/** A bend this sharp, radians per metre, is worth drifting through, and below the second one the drift is let go. */
const DRIFT_IN = 0.02;
const DRIFT_OUT = 0.008;

/**
 * The pedals for a computer driver, on the same drive model as a player.
 * Into a real bend at pace it brakes with Drive still held, which starts
 * a power slide, and holds it while the bend lasts. It lets go early when
 * the slide carries it wide or it has to fight the wheel, which fires
 * the turbo. Elsewhere it lifts for a bend and brakes for a hairpin,
 * never lifting with the wheel turned hard, which would start a drift it
 * did not mean.
 */
export function botPedals(kart: Kart, track: Track, steer: number, speed: number): { throttle: boolean; brake: boolean } {
  const here = track.sharpestAhead(kart.loc.s, 8 + speed * 0.7);
  if (kart.drift !== 0) {
    const f = track.frameAt(kart.loc.s);
    const side = Math.sign(kart.loc.d) || 1;
    const outward = (kart.vx * f.rx + kart.vz * f.rz) * side;
    const wide = Math.abs(kart.loc.d) > track.halfWidth * 0.7 && outward > 1;
    const hold = Math.sign(here) === kart.drift && Math.abs(here) > DRIFT_OUT && !wide;
    return { throttle: true, brake: hold };
  }
  const bend = track.sharpestAhead(kart.loc.s + 4, 26 + speed * 0.8);
  const safe = Math.sqrt(CORNER_GRIP / Math.max(Math.abs(bend), 0.002));
  const intoBend = Math.abs(here) > DRIFT_IN && Math.sign(here) === Math.sign(steer) && Math.abs(steer) > DRIFT.brakeSteer + 0.05;
  if (intoBend && speed > baseTop(kart) * (DRIFT.minSpeed + 0.1) && Math.abs(kart.loc.d) < track.halfWidth * 0.5) return { throttle: true, brake: true };
  const hard = Math.abs(steer) > DRIFT.liftSteer - 0.1;
  return { throttle: speed < safe + 1.5 || hard, brake: speed > safe + 6 && Math.abs(steer) < DRIFT.brakeSteer - 0.05 };
}
