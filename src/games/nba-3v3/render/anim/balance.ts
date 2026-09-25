import type { Pose } from "./pose";

/** The body's balance on top of the legs' cycle, from the engine's momentum and the player's state. */
export interface Balance {
  /** Acceleration along the way the player faces, m/s² (smoothed): pushing off forward, or braking. */
  ahead: number;
  /** Acceleration to the player's right, m/s² (smoothed): leaning into a cut. */
  side: number;
  /** 0 to 1 while a hard cut has a foot planted. */
  plant: number;
  /** 0 to 1 while beaten or off balance. */
  whiff: number;
  /** 0 to 1 while gathering after a landing. */
  recover: number;
  time: number;
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Weight and balance over whatever the legs are doing. A burst leans the
 * body over the feet and a hard stop sits it back. A cut plants the
 * outside foot wide with the knee loaded and the body leaning into the
 * new line. Off balance, the chest rocks back and the arms go out; after
 * a landing the knees stay soft a moment.
 */
export function balance(p: Pose, b: Balance): Pose {
  const ahead = clamp1(b.ahead / 14);
  const side = clamp1(b.side / 14);
  p.torsoX += ahead * (ahead > 0 ? 0.32 : 0.22);
  p.neckX -= ahead * 0.12;
  p.hipY -= Math.abs(ahead) * 0.03;
  if (ahead < 0) {
    // Braking: the knees take the stop.
    p.kneeL -= ahead * 0.35;
    p.kneeR -= ahead * 0.35;
    p.legLLift -= ahead * 0.18;
    p.legRLift -= ahead * 0.18;
  }
  p.torsoZ += side * 0.22;
  p.pelvisZ -= side * 0.06;

  if (b.plant > 0) {
    // The outside foot, away from the new direction, goes out wide and takes the load.
    const k = b.plant;
    const out = side >= 0 ? 1 : -1;
    p.hipY -= 0.07 * k;
    p.torsoZ += 0.12 * out * k;
    if (out > 0) {
      p.legLSpread += 0.42 * k;
      p.kneeL += 0.55 * k;
      p.legLLift += 0.2 * k;
      p.footL = p.footL * (1 - k);
    } else {
      p.legRSpread += 0.42 * k;
      p.kneeR += 0.55 * k;
      p.legRLift += 0.2 * k;
      p.footR = p.footR * (1 - k);
    }
  }

  if (b.whiff > 0) {
    const k = b.whiff;
    const wave = Math.sin(b.time * 16) * 0.25 * k;
    p.torsoX -= 0.35 * k;
    p.neckX += 0.15 * k;
    p.armLRaise += (0.7 + wave) * k;
    p.armRRaise += (0.6 - wave) * k;
    p.armLSpread += 0.6 * k;
    p.armRSpread += 0.6 * k;
    p.legLLift += 0.25 * k;
    p.legRLift -= 0.2 * k;
    p.kneeL += 0.3 * k;
  }

  if (b.recover > 0) {
    const k = b.recover;
    p.hipY -= 0.07 * k;
    p.kneeL += 0.55 * k;
    p.kneeR += 0.55 * k;
    p.legLLift += 0.27 * k;
    p.legRLift += 0.27 * k;
    p.torsoX += 0.15 * k;
  }
  return p;
}
