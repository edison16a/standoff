import type { Celebration } from "../../roster";
import type { Frame } from "./frame";
import { neutral, type Pose } from "./pose";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const UP = -2.9;

/**
 * Every star's own goal celebration, and the plain cheers and slumps of
 * everyone else. Each is a pose at `t` seconds into the celebration.
 */
export function celebration(kind: Celebration, t: number): Pose {
  const p = neutral();
  const inT = smooth(t / 0.35);
  switch (kind) {
    case "skypoint": {
      // Both index fingers to the sky, looking up.
      p.shLX = p.shRX = UP * 0.92 * inT;
      p.shLZ = p.shRZ = 0.35;
      p.elL = p.elR = -0.2;
      p.neckX = -0.55 * inT;
      p.spineX = -0.15 * inT;
      p.lift = 0.02 * Math.sin(t * 3);
      break;
    }
    case "jumpspin": {
      // A run up, a jump with a half turn, and landing arms spread wide and low.
      const jump = clamp01((t - 0.2) / 0.55);
      p.lift = 0.55 * Math.sin(Math.PI * jump) * (jump < 1 ? 1 : 0);
      p.yaw = Math.PI * smooth(jump);
      p.kneeL = p.kneeR = 0.9 * Math.sin(Math.PI * jump);
      const land = smooth((t - 0.75) / 0.2);
      p.shLZ = p.shRZ = 0.3 + 1.05 * land;
      p.shLX = p.shRX = 0.35 * land;
      p.hipLZ = p.hipRZ = 0.35 * land;
      p.kneeL = p.kneeR = Math.max(p.kneeL, 0.35 * land);
      p.lift -= 0.12 * land;
      p.pitch = -0.08 * land;
      p.neckX = -0.3 * land;
      break;
    }
    case "armsfolded": {
      // Stock still, arms folded across the chest.
      p.shLX = p.shRX = -0.4 * inT;
      p.shLY = p.shRY = 1.35 * inT;
      p.shLZ = p.shRZ = 0.15;
      p.elL = p.elR = -1.75 * inT;
      p.spineX = -0.08;
      p.neckX = -0.12;
      p.hipLZ = p.hipRZ = 0.12;
      break;
    }
    case "zen": {
      // Sat cross legged on the turf, hands resting open on the knees.
      const sit = smooth(t / 0.6);
      p.lift = -0.72 * sit;
      p.hipLX = p.hipRX = -1.45 * sit;
      p.hipLZ = p.hipRZ = 0.75 * sit;
      p.kneeL = p.kneeR = 2.3 * sit;
      p.shLX = p.shRX = -0.5 * sit;
      p.shLZ = p.shRZ = 0.45 * sit;
      p.elL = p.elR = -0.6 * sit;
      p.neckX = -0.1;
      p.spineX = -0.05 + 0.02 * Math.sin(t * 1.5);
      break;
    }
    case "samba": {
      // A dance: hips swinging, arms rolling, knees bouncing to the beat.
      const beat = t * 7;
      p.roll = 0.12 * Math.sin(beat);
      p.spineZ = -0.2 * Math.sin(beat);
      p.lift = -0.05 + 0.05 * Math.abs(Math.sin(beat));
      p.kneeL = 0.4 + 0.35 * Math.max(0, Math.sin(beat));
      p.kneeR = 0.4 + 0.35 * Math.max(0, -Math.sin(beat));
      p.hipLX = -0.2 - 0.3 * Math.max(0, Math.sin(beat));
      p.hipRX = -0.2 - 0.3 * Math.max(0, -Math.sin(beat));
      p.shLX = -1.3 + 0.5 * Math.sin(beat);
      p.shRX = -1.3 - 0.5 * Math.sin(beat);
      p.shLZ = p.shRZ = 0.5;
      p.elL = p.elR = -1.3;
      break;
    }
    case "armswide": {
      // Arms flung wide, chest out, soaking it in.
      p.shLZ = p.shRZ = 1.45 * inT;
      p.shLX = p.shRX = -0.25 * inT;
      p.elL = p.elR = -0.1;
      p.spineX = -0.25 * inT;
      p.neckX = -0.4 * inT;
      p.hipLZ = p.hipRZ = 0.15;
      break;
    }
    case "kneeslide": {
      // Down onto both knees, sliding, both fists pumping.
      const down = smooth(t / 0.3);
      p.lift = -0.46 * down;
      p.hipLX = p.hipRX = 0.1 * down;
      p.kneeL = p.kneeR = 1.55 * down;
      p.ankL = p.ankR = 0.5 * down;
      p.spineX = -0.35 * down;
      p.shLX = p.shRX = (UP * 0.6 + 0.2 * Math.sin(t * 8)) * down;
      p.shLZ = p.shRZ = 0.6;
      p.elL = p.elR = -1.6;
      p.neckX = -0.4 * down;
      break;
    }
    case "airplane": {
      // Wings out, banking one way then the other.
      p.shLZ = p.shRZ = 1.5 * inT;
      p.roll = 0.3 * Math.sin(t * 2.4) * inT;
      p.pitch = 0.2 * inT;
      p.hipLX = -0.4 * Math.sin(t * 9);
      p.hipRX = 0.4 * Math.sin(t * 9);
      p.kneeL = p.kneeR = 0.5;
      break;
    }
    case "fistpump": {
      // Crouched, roaring, both fists pumping hard.
      const pump = Math.sin(t * 9);
      p.lift = -0.14 * inT;
      p.kneeL = p.kneeR = 0.6 * inT;
      p.hipLX = p.hipRX = -0.45 * inT;
      p.hipLZ = p.hipRZ = 0.3;
      p.pitch = 0.2 * inT;
      p.shLX = p.shRX = (-0.9 + 0.35 * pump) * inT;
      p.shLZ = p.shRZ = 0.55;
      p.elL = p.elR = -2;
      p.neckX = -0.35;
      break;
    }
    case "handsign": {
      // A little hop, then both hands shaping numbers in front of the chest.
      p.lift = t < 0.4 ? 0.3 * Math.sin((Math.PI * t) / 0.4) : 0;
      p.shLX = p.shRX = -1.25 * inT;
      p.shLZ = 0.15;
      p.shRZ = 0.15;
      p.elL = -1.1 + 0.1 * Math.sin(t * 5);
      p.elR = -1.1 - 0.1 * Math.sin(t * 5);
      p.neckX = 0.1;
      p.spineX = -0.06;
      break;
    }
  }
  return p;
}

/** A team mate's cheer: bouncing with both fists up. */
export function cheer(t: number, phase: number): Pose {
  const p = neutral();
  const hop = Math.abs(Math.sin(t * 5.5 + phase));
  p.lift = 0.22 * hop;
  p.kneeL = p.kneeR = 0.5 * (1 - hop);
  p.shLX = p.shRX = UP * 0.85;
  p.shLZ = p.shRZ = 0.45;
  p.elL = p.elR = -0.9;
  p.neckX = -0.3;
  return p;
}

/** Hands on hips, head down, after conceding or losing, trudging on the run's legs. */
export function dejected(f: Frame, t: number, phase: number): Frame {
  const p = f.pose;
  p.neckX = 0.55 + 0.05 * Math.sin(t * 1.3 + phase);
  p.spineX = 0.22;
  p.shLX = p.shRX = 0.35;
  p.shLZ = p.shRZ = 0.62;
  p.elL = p.elR = -1.7;
  p.spineY *= 0.3;
  return f;
}
