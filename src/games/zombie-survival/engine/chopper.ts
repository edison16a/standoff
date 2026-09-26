import type { Cutscene, Phase } from "./events";
import { segment } from "./route";
import { CHOPPER_STAGE } from "./stages";

/** Metres along the roof to the helipad, where the chopper sets down. */
export const HELIPAD = 18;
/** Cutscene seconds: touching down, then the team aboard. */
const LAND_AT = 3;
export const BOARD_AT = 5;
/** Metres the chopper climbs above the roof before it heads for the docks. */
const LIFT = 8;
/** Metres along the roof where the chopper starts down toward the docks. */
const DESCEND_FROM = 40;
/** Seconds the chopper takes to pull away once it drops the team. */
const LEAVE_SECONDS = 6;

export interface ChopperPose {
  /** Which stage's fight frame the numbers below are in. */
  frame: number;
  /** Metres ahead, to the right, and up from the frame's origin. */
  ahead: number;
  side: number;
  up: number;
  /** Turn about the vertical, in radians. At PI / 2 the nose points down the road. */
  yaw: number;
  /** Nose down tilt. */
  pitch: number;
  /** The team is inside, so the view rides along and the model is not drawn. */
  aboard: boolean;
  /** How loud the rotor is, 0 to 1. */
  loudness: number;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** True while the chopper carries the team from the roof to the docks. */
export function inFlight(phase: Phase, stage: number): boolean {
  return phase === "travel" && stage === CHOPPER_STAGE + 1;
}

/**
 * Height of the cabin floor on the flight, as a world y, this many metres
 * along the roof segment. It holds above the roof, then sinks to the
 * ground at the segment's end, where the next fight starts.
 */
export function flightFloor(along: number): number {
  const seg = segment(CHOPPER_STAGE + 1);
  const k = ease((along - DESCEND_FROM) / (seg.length - DESCEND_FROM));
  return seg.start.y + LIFT + (seg.end.y - seg.start.y - LIFT) * k;
}

const at = (ahead: number, side: number, up: number, yaw: number, pitch: number, loudness: number, aboard = false): ChopperPose => ({
  frame: CHOPPER_STAGE,
  ahead,
  side,
  up,
  yaw,
  pitch,
  aboard,
  loudness,
});

/**
 * Where the rescue chopper is, as a pure function of the game's phase
 * and time, so the picture and the rotor noise always agree. It circles
 * while the team holds the roof, lands on the helipad, lifts the team
 * off, flies them to the docks and pulls away once they are down.
 */
export function chopperPose(phase: Phase, stage: number, cutscene: Cutscene | null, phaseTime: number): ChopperPose | null {
  const t = phaseTime;
  if (stage === CHOPPER_STAGE && (phase === "travel" || phase === "fight" || phase === "down")) {
    const a = t * 0.25;
    return at(44 + Math.sin(a) * 8, Math.cos(a) * 16, 17, a + Math.PI / 2, 0.12, 0.35);
  }
  if (stage === CHOPPER_STAGE && phase === "clear") {
    // Swings round to line up with the helipad.
    const k = ease(t / 4);
    return at(44 - k * 10, 16 * (1 - k), 17 - k * 4, Math.PI * (1 - k * 0.5), 0.12, 0.35 + k * 0.3);
  }
  if (phase === "cutscene" && cutscene === "chopper") {
    if (t < LAND_AT) {
      // Down onto the pad, turning side on so the open door faces the team.
      const k = ease(t / LAND_AT);
      return at(34 - k * (34 - HELIPAD), 0, 13 - k * 13, Math.PI * (0.5 + k * 0.5), 0.12 * (1 - k), 0.65 + k * 0.35);
    }
    if (t < BOARD_AT) return at(HELIPAD, 0, 0, Math.PI, 0, 1);
    return at(HELIPAD, 0, ease((t - BOARD_AT) / 3) * LIFT, Math.PI, 0, 1, true);
  }
  if (inFlight(phase, stage)) return at(HELIPAD, 0, LIFT, Math.PI / 2, 0, 1, true);
  if (stage === CHOPPER_STAGE + 1 && phase === "fight" && t < LEAVE_SECONDS) {
    // Up and away over the docks, nose down, fading out.
    const k = t / LEAVE_SECONDS;
    return { ...at(6 + k * 45, -k * 8, 3 + k * k * 9, Math.PI / 2, 0.25, 0.9 * (1 - k)), frame: CHOPPER_STAGE + 1 };
  }
  return null;
}
