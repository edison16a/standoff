import type { ApproachKind } from "../../../engine/tackle-preset";
import { keyed, over, type Pose } from "../pose";
import { BASE, PRONE, WRAP_ARMS } from "./body-keys";

/**
 * The lunge, drawn as the tackle it was picked as. A wrap is a leap at
 * the hips with the arms open; a drive stays on its feet, low, shoulder
 * first; a cut at the ankles skims the turf; a shoestring dive lays out
 * flat at full stretch. `u` runs 0 to 1 through the lunge.
 */
const COIL = over(BASE, { pitch: 0.55, hipLX: -1.0, hipRX: -0.4, kneeL: 1.4, kneeR: 1.0, shLX: -0.6, shRX: -0.6, elL: -1.2, elR: -1.2 });
const OPEN_ARMS: Partial<Pose> = { shLX: -1.7, shRX: -1.7, shLZ: 0.8, shRZ: 0.8, elL: -0.6, elR: -0.6 };

const LEAP = over(BASE, { lift: 0.55, pitch: 0.9, neckX: -0.9, fwd: 0.25, ...OPEN_ARMS, hipLX: 0.1, hipRX: 0.45, kneeL: 0.5, kneeR: 1.0 });
const DRIVE_A = over(BASE, { pitch: 0.55, spineX: 0.15, neckX: -0.7, ...WRAP_ARMS, shLX: -1.1, shRX: -1.1, hipLX: -1.0, kneeL: 1.3, hipRX: 0.35, kneeR: 0.6 });
const DRIVE_B = over(DRIVE_A, { hipLX: 0.35, kneeL: 0.6, hipRX: -1.0, kneeR: 1.3 });
const SKIM = over(BASE, { lift: 0.12, pitch: 1.25, neckX: -1.0, shLX: -2.3, shRX: -2.3, elL: -0.4, elR: -0.4, shLZ: 0.4, shRZ: 0.4, hipLX: 0.2, hipRX: 0.35, kneeL: 0.5, kneeR: 0.8 });
const LAYOUT = over(BASE, { lift: 0.32, pitch: 1.45, neckX: -1.1, shLX: -2.9, shRX: -2.8, elL: -0.1, elR: -0.15, shLZ: 0.15, shRZ: 0.1, hipLX: 0.25, hipRX: 0.35, kneeL: 0.4, kneeR: 0.7 });

export function lungeFor(approach: ApproachKind, u: number): Pose {
  switch (approach) {
    case "wrap":
      return keyed([[0, COIL], [0.25, LEAP], [0.8, over(LEAP, { lift: 0.15, pitch: 1.3, ...WRAP_ARMS })], [1, PRONE]], u);
    case "drive":
      return keyed([[0, COIL], [0.2, DRIVE_A], [0.45, DRIVE_B], [0.7, DRIVE_A], [0.9, over(DRIVE_B, { pitch: 0.9 })], [1, over(PRONE, { lift: 0.1 })]], u);
    case "ankle":
      return keyed([[0, over(COIL, { pitch: 0.7, kneeL: 1.6, kneeR: 1.3 })], [0.22, SKIM], [0.85, over(SKIM, { lift: 0.04, pitch: 1.45 })], [1, PRONE]], u);
    case "shoestring":
      return keyed([[0, COIL], [0.18, LAYOUT], [0.8, over(LAYOUT, { lift: 0.14 })], [1, over(PRONE, { shLX: -2.9, shRX: -2.8 })]], u);
  }
}
