import type { JukeKind } from "../../engine/types";
import { bump, keyed, over, smooth, type Pose } from "./pose";

/**
 * The three jukes, on top of the run pose. The engine already turns the
 * body through a spin and shoves it sideways for a side step or a back
 * move; these add the body language that sells it: the sink, the plant
 * foot, the lean, and the free arm swinging out for balance. The ball
 * stays tucked under the right arm throughout. `side` is 1 when the
 * move goes to the runner's left.
 */
export function jukePose(kind: JukeKind, t: number, dur: number, side: 1 | -1, run: Pose): Pose {
  const u = t / Math.max(0.01, dur);
  const tucked = { shRX: -0.1, elR: -1.95, shRY: 0.45, shRZ: 0 };
  if (kind === "spin") {
    // Sink, whirl with the arms pulled in, then pop out of it running.
    const sink = bump(u);
    return over(run, {
      ...tucked, pitch: 0.15 + 0.2 * sink, roll: side * 0.12 * sink, spineX: 0.2 * sink,
      hipLX: -0.6 * sink, hipRX: 0.3 * sink, kneeL: 0.7 + 0.5 * sink, kneeR: 0.9 + 0.4 * sink,
      shLX: -0.4, shLZ: 0.25 + 1.0 * sink, elL: -0.5, neckY: side * 0.4 * sink,
    });
  }
  if (kind === "back") {
    // A hard plant: the body sits back over the heels, then drives off the outside foot.
    const plant = keyed([
      [0, run],
      [0.3, over(run, { pitch: -0.3, spineX: -0.1, hipLX: -0.9, hipRX: -0.2, kneeL: 0.5, kneeR: 1.0, roll: side * 0.15 })],
      [0.75, over(run, { pitch: 0.25, roll: -side * 0.25, hipLX: side > 0 ? 0.5 : -0.6, hipRX: side > 0 ? -0.6 : 0.5, kneeL: 0.9, kneeR: 0.9 })],
      [1, run],
    ], u);
    return over(plant, { ...tucked, shLX: -0.6, shLZ: 0.9 * bump(u), elL: -0.4 });
  }
  // The side step: the body leans hard across as the outside foot pushes off, both feet leaving the grass.
  const hop = bump(u);
  const push = smooth(u / 0.35) * (1 - smooth((u - 0.7) / 0.3));
  return over(run, {
    ...tucked, lift: 0.12 * hop, roll: side * 0.4 * push, pitch: 0.2,
    hipLZ: 0.2 + (side > 0 ? 0.35 : 0.05) * push, hipRZ: 0.2 + (side < 0 ? 0.35 : 0.05) * push,
    hipLX: -0.3, hipRX: -0.1, kneeL: 0.8, kneeR: 0.8,
    shLX: -0.5, shLZ: 0.3 + 0.7 * push, elL: -0.6, spineZ: -side * 0.15 * push,
  });
}
