import { insideRoute } from "../route-bounds";
import type { V2 } from "../vec";

/** How the back carries a run call: wide, wide then up, straight up inside, or a step one way and back the other. */
export const CARRIES = ["sweep", "stretch", "dive", "counter"] as const;
export type CarryKind = (typeof CARRIES)[number];

export const CARRY_WORDS: Record<CarryKind, string> = { sweep: "Sweep", stretch: "Stretch", dive: "Dive", counter: "Counter" };

/**
 * Each carry as metres downfield and metres out toward the back's own
 * side of the QB, from where the back lines up. The sweep is the old
 * run call's path: out wide past the linemen, then upfield.
 */
const CARRY_SHAPES: Record<CarryKind, readonly (readonly [number, number])[]> = {
  sweep: [[1, 3], [5, 7], [40, 9]],
  stretch: [[2, 4.5], [6, 5.5], [40, 6.5]],
  dive: [[3, -2.4], [8, -2.6], [40, -2.2]],
  counter: [[1.2, 1.4], [4, -3], [9, -7], [40, -8]],
};

/** The back's path for a carry, from where he lines up beside the QB at `qbZ`, attacking toward `sign`. */
export function carryPoints(kind: CarryKind, back: V2, qbZ: number, sign: 1 | -1): V2[] {
  const side = back.z >= qbZ ? 1 : -1;
  return CARRY_SHAPES[kind].map(([down, wide]) => insideRoute({ x: back.x + sign * down, z: back.z + side * wide }));
}
