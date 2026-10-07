import { mix, over, smooth, type Pose } from "../pose";

/**
 * Reaching for a ball in the air: both arms up and out toward it,
 * hands together to make a basket. `reach` is 0 to 1 as it arrives,
 * `high` lifts the hands above the helmet for a ball arriving high.
 */
export function catchPose(base: Pose, reach: number, high: number): Pose {
  const hands = over(base, {
    shLX: -1.6 - high * 1.2, shRX: -1.6 - high * 1.2, elL: -0.5 + high * 0.3, elR: -0.5 + high * 0.3,
    shLZ: 0.18, shRZ: 0.18, shLY: 0.25, shRY: 0.25, neckX: base.neckX - 0.3 - high * 0.3, spineX: base.spineX - 0.1,
  });
  return mix(base, hands, smooth(reach));
}
