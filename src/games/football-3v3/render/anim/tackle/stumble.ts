import { add, bump, type Pose } from "../pose";
import { mirrorDelta } from "./body-keys";

/**
 * Fooled by a juke but still up: the weight lurches the way the fake
 * went, the near leg crosses under him, one hand drops toward the turf
 * and the other arm flies out, then he gathers himself. Added on top of
 * whatever his legs are doing. `side` 1 lurches to his left.
 */
const LURCH: Partial<Pose> = {
  roll: 0.32, side: 0.1, pitch: 0.28, spineZ: 0.12,
  hipLZ: -0.2, hipRZ: 0.35, kneeL: 0.5, kneeR: 0.35,
  shLX: -0.7, shLZ: 0.55, elL: -0.2, shRZ: 0.9, elR: -0.5,
};

export function stumbleOver(p: Pose, t: number, dur: number, side: 1 | -1): Pose {
  const k = bump(t / dur);
  const d = side > 0 ? LURCH : mirrorDelta(LURCH);
  const scaled: Partial<Pose> = {};
  for (const [j, v] of Object.entries(d) as [keyof Pose, number][]) scaled[j] = v * k;
  return add({ ...p }, scaled);
}
