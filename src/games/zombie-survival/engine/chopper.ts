import type { Cutscene, Phase } from "./events";
import { CHOPPER_STAGE } from "./stages";

/** When the chopper hits the street below the roof, in cutscene seconds. */
export const CRASH_AT = 8.3;
const APPROACH_END = 4;

export interface ChopperPose {
  /** In the roof fight's frame: metres ahead, to the right, and up from the roof. */
  ahead: number;
  side: number;
  up: number;
  /** Turn about the vertical, in radians. The spin gets wild as it fails. */
  yaw: number;
  /** Nose down tilt. */
  pitch: number;
  /** 0 healthy to 1 dead engine. */
  failing: number;
  /** Seconds since the crash, or null before it. */
  crashed: number | null;
  /** How loud the rotor is, 0 to 1. */
  loudness: number;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Where the rescue chopper is, as a pure function of the game's phase
 * and time, so the picture and the rotor noise always agree. It circles
 * while the team holds the roof, comes in to land, catches fire, spins
 * out over the edge and crashes into the street.
 */
export function chopperPose(phase: Phase, stage: number, cutscene: Cutscene | null, phaseTime: number): ChopperPose | null {
  if (stage !== CHOPPER_STAGE && !(stage === CHOPPER_STAGE + 1 && phase === "travel")) return null;
  if (stage === CHOPPER_STAGE && (phase === "travel" || phase === "fight" || phase === "down")) {
    const a = phaseTime * 0.25;
    return { ahead: 44 + Math.sin(a) * 8, side: Math.cos(a) * 16, up: 17, yaw: a + Math.PI / 2, pitch: 0.12, failing: 0, crashed: null, loudness: 0.35 };
  }
  if (phase === "clear") {
    // Swings round to line up with the helipad.
    const k = ease(phaseTime / 6);
    return { ahead: 44 - k * 10, side: 16 * (1 - k), up: 17 - k * 4, yaw: Math.PI * (1 - k * 0.5), pitch: 0.12, failing: 0, crashed: null, loudness: 0.35 + k * 0.3 };
  }
  if (phase === "cutscene" && cutscene === "chopper") {
    const t = phaseTime;
    if (t < APPROACH_END) {
      const k = ease(t / APPROACH_END);
      return { ahead: 34 - k * 18, side: 0, up: 13 - k * 7, yaw: Math.PI * 0.5, pitch: 0.12 - k * 0.1, failing: 0, crashed: null, loudness: 0.65 + k * 0.35 };
    }
    if (t < CRASH_AT) {
      const k = (t - APPROACH_END) / (CRASH_AT - APPROACH_END);
      return {
        ahead: 16 + k * 14,
        side: Math.sin(k * Math.PI) * 5 + k * 6,
        up: 6 + Math.sin(k * Math.PI) * 2.5 - k * k * 5.2,
        yaw: Math.PI * 0.5 + k * k * 14,
        pitch: 0.02 + k * 0.5,
        failing: Math.min(1, k * 1.4),
        crashed: null,
        loudness: 1 - k * 0.3,
      };
    }
    return { ahead: 30, side: 6, up: 0.1, yaw: 2.2, pitch: 0.3, failing: 1, crashed: t - CRASH_AT, loudness: 0 };
  }
  if (phase === "travel" && stage === CHOPPER_STAGE + 1) return { ahead: 30, side: 6, up: 0.1, yaw: 2.2, pitch: 0.3, failing: 1, crashed: 10 + phaseTime, loudness: 0 };
  return null;
}
