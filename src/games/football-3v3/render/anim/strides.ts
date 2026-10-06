import { cycle, type CycleKeys } from "./cycle";

/**
 * One leg through a stride, from the moment its foot strikes the turf
 * (leg phase 0). The foot is down for the first `duty` of the cycle and
 * swings through the air for the rest. Walking and running have their
 * own curves for the thigh, the knee and the ankle, drawn from how real
 * athletes move, and a sprint drives the knee higher and folds the heel
 * tighter. The planted foot is held still on the turf by the foot lock;
 * these angles carry the rest of the stride.
 */
export interface LegAngles {
  /** Thigh swing: negative forward of the hip, positive behind. */
  hip: number;
  knee: number;
  /** Positive points the toes down. */
  ankle: number;
}

/** Walking: heel strike, roll over a straight knee, push off the toes. */
const WALK = {
  hip: [[0, -0.36], [0.3, -0.02], [0.58, 0.24], [0.75, -0.12], [0.9, -0.38]] as CycleKeys,
  knee: [[0, 0.06], [0.12, 0.26], [0.32, 0.08], [0.58, 0.5], [0.72, 1.0], [0.9, 0.14]] as CycleKeys,
  ankle: [[0, -0.12], [0.1, 0.02], [0.45, -0.08], [0.6, 0.34], [0.72, 0.0], [0.9, -0.1]] as CycleKeys,
};

/** Running keys placed by the share of the stride on the ground. */
function runKeys(duty: number, sprint: number): { hip: CycleKeys; knee: CycleKeys; ankle: CycleKeys } {
  const d = duty;
  const air = 1 - d;
  return {
    hip: [[0, -0.5 - 0.08 * sprint], [d, 0.42 + 0.05 * sprint], [d + air * 0.45, -0.28], [d + air * 0.82, -0.78 - 0.24 * sprint]],
    knee: [[0, 0.36], [d * 0.5, 0.7], [d, 0.3], [d + air * 0.4, 1.8 + 0.4 * sprint], [d + air * 0.78, 0.72], [0.97, 0.4]],
    ankle: [[0, -0.02], [d * 0.5, -0.24], [d, 0.48], [d + air * 0.3, 0.25], [d + air * 0.72, -0.08]],
  };
}

export function legAngles(phase: number, duty: number, run: number, sprint: number): LegAngles {
  const r = runKeys(duty, sprint);
  const mixKeys = (walk: CycleKeys, running: CycleKeys) => cycle(walk, phase) * (1 - run) + cycle(running, phase) * run;
  return { hip: mixKeys(WALK.hip, r.hip), knee: mixKeys(WALK.knee, r.knee), ankle: mixKeys(WALK.ankle, r.ankle) };
}

/** The leg's own phase, 0 at its foot strike: the left foot strikes at a quarter of the stride, the right at three quarters. */
export function legPhase(phase: number, left: boolean): number {
  return (((phase - (left ? 0.25 : 0.75)) % 1) + 1) % 1;
}

/** Whether a foot is down at this point in the stride. */
export function onGround(phase: number, left: boolean, duty: number): boolean {
  return legPhase(phase, left) < duty;
}
