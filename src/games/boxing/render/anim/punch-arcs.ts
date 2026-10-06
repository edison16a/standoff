import type { PunchStyle } from "../../engine/types";

/** How far under the middle of the face an uppercut lands, in metres. */
export const UPPERCUT_CHIN = 0.07;

/**
 * The path each kind of punch takes, as offsets with x toward the
 * punching hand's own side: the wind up, the swing on the way (a hook
 * goes out wide, an uppercut dips low to come up from under), the
 * elbow's pull and the glove's roll.
 */
export interface Arc {
  cock: readonly [number, number, number];
  swing: readonly [number, number, number];
  pole: readonly [number, number, number];
  roll: number;
}
const STRAIGHT: Arc = { cock: [0.02, -0.03, -0.12], swing: [0, 0, 0], pole: [0.35, -0.7, -0.1], roll: 0.1 };
export const ARCS: Record<PunchStyle, Arc> = {
  jab: STRAIGHT,
  cross: STRAIGHT,
  hook: { cock: [0.08, -0.03, -0.12], swing: [0.28, 0.05, -0.05], pole: [0.9, 0.05, -0.15], roll: 0.9 },
  // The glove drops by the hip, then drives up with the elbow under it and the palm turned in.
  uppercut: { cock: [0.03, -0.14, -0.08], swing: [-0.02, -0.34, -0.05], pole: [0.3, -0.9, 0.15], roll: 0.2 },
};
