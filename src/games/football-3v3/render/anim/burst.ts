import { SHED } from "../../engine/burst";
import type { AthleteView } from "../../engine/view";
import { BULL, RIP_THROUGH, SWIM } from "./block/keys";
import { add, keyed, over, type Keys, type Pose } from "./pose";
import { mirror } from "./tackle/body-keys";

/**
 * A rusher breaking free of the men holding him at the line (engine
 * burst.ts): hands locked out into the blocker, a club that knocks the
 * blocker's arms down, the swim arm thrown over his shoulder, the rip
 * through low turning the corner, then the first explosive step at the
 * QB. After that the stride takes over, still leaning hard into the
 * burst of speed, and stands up as it fades. Authored to swim over to
 * his left; mirrored for the right.
 */

/** The club: the outside arm chops down across the blocker's arms while the other still drives. */
const CLUB = over(BULL, { yaw: 0.2, spineY: 0.25, shRX: -0.9, elR: -0.25, shRY: 0.6, shLX: -1.6, elL: -0.1, pitch: 0.7 });

/** Clear: low as a sprinter out of the blocks, the far knee driving and the arms pumping big. */
const LAUNCH = over(RIP_THROUGH, {
  yaw: 0.25, pitch: 0.8, spineY: 0.05, neckX: -0.7,
  shRX: 0.9, elR: -0.9, shRZ: 0.15, shLX: -1.3, elL: -1.2, shLZ: 0.15,
  hipLX: -1.35, kneeL: 1.5, hipRX: 0.45, kneeR: 0.35,
});

const BREAK: Keys = [
  [0, BULL],
  [0.1, CLUB],
  [0.2, SWIM],
  [0.32, RIP_THROUGH],
  [SHED.rip, LAUNCH],
];

/** Seconds after the rip the stride keeps its extra lean, fading to none. */
const LEAN_FADE = 0.7;

/**
 * The pose for a man breaking free, or null when he is not. `air` says
 * the feet are the move's own (the rip), not the stride's.
 */
export function burstMove(a: AthleteView, run: () => Pose): { pose: Pose; free: boolean } | null {
  const b = a.burst;
  if (!b || a.action !== "none") return null;
  if (b.t < SHED.rip) {
    const p = keyed(BREAK, b.t);
    return { pose: b.side > 0 ? p : mirror(p), free: true };
  }
  const k = Math.max(0, 1 - (b.t - SHED.rip) / LEAN_FADE);
  if (k <= 0) return null;
  // Driving at the QB: the chest down over the knees and the head up, easing into an upright run.
  return { pose: add(run(), { pitch: 0.32 * k, neckX: -0.3 * k, spineX: 0.08 * k }), free: false };
}
