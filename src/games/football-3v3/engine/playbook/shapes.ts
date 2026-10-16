import { YARD } from "../field";
import type { V2 } from "../vec";
import { layLegs } from "./lay";

/**
 * The routes a play call can give a runner. Each is drawn on the play
 * card and run by a computer runner exactly as drawn. A block is the
 * one job that is not a route: a step up to the line to hold a rusher.
 */
export const PLAY_ROUTES = [
  "go", "fade", "post", "seam", "corner", "wheel",
  "slant", "out", "dig", "curl", "comeback", "flat", "drag", "zig", "block",
] as const;
export type PlayRoute = (typeof PLAY_ROUTES)[number];

/** Routes that go far: a play has one or two of them. */
export const DEEP: ReadonlySet<PlayRoute> = new Set(["go", "fade", "post", "seam", "corner", "wheel"]);

/** Routes that end by settling, the runner stopping and facing the QB. */
export const SETTLES: ReadonlySet<PlayRoute> = new Set(["curl", "comeback", "block"]);

/** The word for each route on a play card. */
export const ROUTE_WORDS: Record<PlayRoute, string> = {
  go: "Go", fade: "Fade", post: "Post", seam: "Seam", corner: "Corner", wheel: "Wheel",
  slant: "Slant", out: "Out", dig: "Dig", curl: "Curl", comeback: "Comeback", flat: "Flat", drag: "Drag", zig: "Zig zag", block: "Block",
};

/**
 * Each route as yards downfield and yards out toward the runner's own
 * side of the ball (negative cuts back across the field), from where he
 * lines up. Every leg runs straight up the field, straight across it or
 * at a clean forty five degrees, so the card draws crisp lines with
 * sharp cuts and a runner makes the same cuts on the grass. A runner
 * runs the legs in turn and keeps going the way the last one points,
 * unless the route settles.
 */
const SHAPES: Record<PlayRoute, readonly (readonly [number, number])[]> = {
  go: [[45, 0]],
  fade: [[5, 0], [9, 4], [45, 4]],
  post: [[11, 0], [35, -24]],
  seam: [[6, 0], [8, -2], [45, -2]],
  corner: [[11, 0], [30, 19]],
  wheel: [[0, 5], [45, 5]],
  slant: [[3, 0], [30, -27]],
  out: [[8, 0], [8, 14]],
  dig: [[10, 0], [10, -16]],
  curl: [[11, 0], [9, -2]],
  comeback: [[14, 0], [11, 3]],
  flat: [[3, 3], [3, 14]],
  drag: [[2, -2], [2, -28]],
  zig: [[5, 0], [8, -3], [11, 0], [45, 0]],
  block: [[1, -1]],
};

/**
 * A route's waypoints on the ground for a runner lined up at `start`,
 * attacking toward `sign` along x, breaking `out` (1 toward +z, -1
 * toward -z). Every leg stays inside the field (lay.ts).
 */
export function playRoutePoints(kind: PlayRoute, start: V2, sign: 1 | -1, out: 1 | -1): V2[] {
  return layLegs(start, SHAPES[kind].map(([down, wide]) => ({ x: start.x + sign * down * YARD, z: start.z + out * wide * YARD })));
}

/** Which way is out for a runner lined up at `z` with the ball at `ballZ`: away from the ball. */
export const outOf = (z: number, ballZ: number): 1 | -1 => (z >= ballZ ? 1 : -1);
