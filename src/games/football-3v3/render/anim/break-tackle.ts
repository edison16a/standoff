import type { AthleteView } from "../../engine/view";
import { keyed, over, type Keys, type Pose } from "./pose";

/**
 * A carrier running through a head on tackle (engine break-tackle.ts),
 * laid over his stride so the legs keep driving. The truck: the left
 * shoulder dips and drives into the tackler's chest, the body takes the
 * jolt, then he leans on through. The stiff arm: the free arm shoots
 * out straight into the facemask, locks out while the legs run past,
 * then pulls back in. The ball stays tucked under the right arm.
 */
type Part = Partial<Pose>;

const TUCK: Part = { shRX: -0.35, elR: -2.0, shRY: 0.5, shRZ: 0.1 };
const TRUCK: [number, Part][] = [
  [0, { pitch: 0.45, spineY: -0.45, spineX: 0.25, neckX: -0.5, shLX: -0.6, elL: -1.6, shLZ: 0.5, ...TUCK }],
  [0.12, { pitch: 0.6, spineY: -0.55, spineX: 0.35, neckX: -0.6, shLX: -0.4, elL: -1.8, shLZ: 0.6, ...TUCK }],
  [0.22, { pitch: 0.2, spineY: -0.2, spineX: -0.1, neckX: 0.1, roll: 0.12, shLX: -0.9, elL: -0.9, shLZ: 0.9, ...TUCK }],
  [0.42, { pitch: 0.42, spineY: -0.1, neckX: -0.4, shLX: -0.8, elL: -1.4, shLZ: 0.4, ...TUCK }],
];
const STIFF: [number, Part][] = [
  [0, { spineY: -0.35, pitch: 0.25, shLX: -1.55, elL: -0.15, shLZ: 0.1, shLY: -0.1, neckX: -0.3, ...TUCK }],
  [0.1, { spineY: -0.45, pitch: 0.3, roll: -0.12, shLX: -1.65, elL: 0, shLZ: 0.05, shLY: -0.15, neckX: -0.35, ...TUCK }],
  [0.32, { spineY: -0.3, pitch: 0.28, roll: -0.08, shLX: -1.3, elL: -0.1, shLZ: 0.35, neckX: -0.3, ...TUCK }],
  [0.5, { pitch: 0.2, shLX: -0.7, elL: -1.4, shLZ: 0.3, ...TUCK }],
];

/** The carrier's pose for the break, or null outside one. */
export function breakMove(a: AthleteView, run: () => Pose): Pose | null {
  const b = a.breaking;
  if (!b || a.action !== "none") return null;
  const legs = run();
  const track = b.kind === "truck" ? TRUCK : STIFF;
  const keys: Keys = [...track.map(([t, part]): [number, Pose] => [t, over(legs, part)]), [b.dur, legs]];
  return keyed(keys, b.t);
}
