import { RING_HALF } from "../../engine/footwork";

/** How high each rope runs above the canvas, from the bottom one up. */
export const ROPE_HEIGHTS = [0.42, 0.78, 1.14, 1.5] as const;
/** How far the ropes run from the middle of the ring, on every side. */
export const ROPE_INSET = RING_HALF + 0.07;

/** A lens this far inside a side's ropes, up to this far outside them, sees them as fat blurred bars. */
const NEAR_INSIDE = 0.15;
const NEAR_OUTSIDE = 1.6;
/** A lens this far over the top rope looks down past the ropes, not through them. */
const OVER_TOP = 0.8;

/**
 * Which sides' ropes to leave out of a picture taken from `eye`, as a
 * broadcast camera poking between the ropes would. A rope just in front
 * of the lens would otherwise draw as a thick bar right across the
 * boxers. Sides go round from +z, as the ring builds them. The players'
 * own cameras stay well inside the ropes, so they always see them all.
 */
export function ropesInTheWay(eye: { x: number; y: number; z: number }): boolean[] {
  return [0, 1, 2, 3].map((side) => {
    const angle = (side * Math.PI) / 2;
    const out = eye.x * Math.sin(angle) + eye.z * Math.cos(angle) - ROPE_INSET;
    return out > -NEAR_INSIDE && out < NEAR_OUTSIDE && eye.y < ROPE_HEIGHTS[3] + OVER_TOP;
  });
}
