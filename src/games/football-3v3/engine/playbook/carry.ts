import type { V2 } from "../vec";
import { layLegs } from "./lay";

/** How the back carries a run call: wide, wide then up, straight up inside, or a step one way and back the other. */
export const CARRIES = ["sweep", "stretch", "dive", "counter"] as const;
export type CarryKind = (typeof CARRIES)[number];

export const CARRY_WORDS: Record<CarryKind, string> = { sweep: "Sweep", stretch: "Stretch", dive: "Dive", counter: "Counter" };

/**
 * Each carry as metres downfield and metres out toward the back's own
 * side of the QB, from where the back lines up, in the same clean legs
 * as the routes (shapes.ts): the sweep runs flat out wide past the
 * linemen, cuts up at forty five degrees and turns upfield.
 */
const CARRY_SHAPES: Record<CarryKind, readonly (readonly [number, number])[]> = {
  sweep: [[0, 4], [4, 8], [40, 8]],
  stretch: [[5, 5], [40, 5]],
  dive: [[2.5, -2.5], [40, -2.5]],
  counter: [[1.5, 1.5], [6, -3], [40, -3]],
};

/** The back's path for a carry, from where he lines up beside the QB at `qbZ`, attacking toward `sign`. */
export function carryPoints(kind: CarryKind, back: V2, qbZ: number, sign: 1 | -1): V2[] {
  const side = back.z >= qbZ ? 1 : -1;
  return layLegs(back, CARRY_SHAPES[kind].map(([down, wide]) => ({ x: back.x + sign * down, z: back.z + side * wide })));
}
