import type { GaitInput } from "./gait";
import type { Pose } from "./pose";
import { smooth } from "./pose";

const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));

/**
 * How the body carries its momentum. Speeding up it leans into the push;
 * braking it sits back on bent knees with the arms out front. Round a
 * curve it banks into the turn, and a hard cut plants the outside leg
 * wide with the hips dropped low. Sliding across, the legs step out to
 * the side instead of forward. Adds to the gait pose in place.
 */
export function leanInto(p: Pose, g: GaitInput, moving: number): void {
  const push = g.push ?? 0;
  const turn = g.turn ?? 0;
  const across = g.across ?? 0;
  // Leaning into a push, up to a quarter radian; braking leans back less, as the legs reach out ahead.
  const drive = clamp(push / 9, 1);
  p.pitch += drive > 0 ? drive * 0.26 : drive * 0.16;
  const brake = smooth(-push / 6) * moving;
  p.kneeL += brake * 0.35;
  p.kneeR += brake * 0.35;
  p.hipLX -= brake * 0.22;
  p.hipRX -= brake * 0.22;
  p.shLX -= brake * 0.35;
  p.shRX -= brake * 0.35;
  p.spineX -= brake * 0.08;
  // Banking: the turning push is sideways, and the whole body tips into it.
  const bank = clamp(turn / 11, 1) * moving;
  p.roll += bank * 0.32;
  p.spineZ -= bank * 0.08;
  // A hard cut: the outside leg plants wide and the hips sink.
  const cut = smooth((Math.abs(turn) - 5) / 6) * moving;
  if (cut > 0) {
    const outsideLeft = turn < 0;
    if (outsideLeft) p.hipLZ += cut * 0.38;
    else p.hipRZ += cut * 0.38;
    p.kneeL += cut * 0.3;
    p.kneeR += cut * 0.3;
    p.side += (turn > 0 ? 1 : -1) * cut * 0.06;
    // The inside arm tucks in and the outside one swings out for balance.
    if (outsideLeft) p.shLZ += cut * 0.5;
    else p.shRZ += cut * 0.5;
  }
  // Shuffling across: legs push out sideways in turn, the feet never crossing.
  const shuffle = smooth((Math.abs(across) - Math.abs(g.ahead) - 0.3) / 1.2) * moving;
  if (shuffle > 0) {
    const s = Math.sin(g.phase * Math.PI * 2);
    p.hipLX *= 1 - shuffle * 0.8;
    p.hipRX *= 1 - shuffle * 0.8;
    p.hipLZ += shuffle * (0.18 + 0.16 * s);
    p.hipRZ += shuffle * (0.18 - 0.16 * s);
    p.kneeL += shuffle * 0.35;
    p.kneeR += shuffle * 0.35;
    p.pitch += shuffle * 0.12;
  }
}
