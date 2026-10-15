import { YARD } from "../field";
import { insideRoute } from "../route-bounds";
import type { V2 } from "../vec";

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
 * lines up. A runner runs the legs in turn and keeps going the way the
 * last one points, unless the route settles.
 */
const SHAPES: Record<PlayRoute, readonly (readonly [number, number])[]> = {
  go: [[5, 0.5], [45, 2]],
  fade: [[4, 1.5], [16, 4], [45, 6]],
  post: [[11, 0], [35, -14]],
  seam: [[6, 0], [45, 0.5]],
  corner: [[11, 0], [30, 11]],
  wheel: [[1, 4], [5, 7], [40, 8]],
  slant: [[2, 0], [9, -6], [30, -20]],
  out: [[8, 0], [8.5, 14]],
  dig: [[10, 0], [10.5, -16]],
  curl: [[11, 0], [9, -1.5]],
  comeback: [[14, 0], [11, 3]],
  flat: [[1, 2.5], [3, 14]],
  drag: [[2, -2], [4.5, -28]],
  zig: [[5, 0], [8, -4], [11, 3], [30, 5]],
  block: [[1.2, -0.6]],
};

/**
 * A route's waypoints on the ground for a runner lined up at `start`,
 * attacking toward `sign` along x, breaking `out` (1 toward +z, -1
 * toward -z). Every waypoint is pulled inside the field (route-bounds.ts).
 */
export function playRoutePoints(kind: PlayRoute, start: V2, sign: 1 | -1, out: 1 | -1): V2[] {
  return SHAPES[kind].map(([down, wide]) => insideRoute({ x: start.x + sign * down * YARD, z: start.z + out * wide * YARD }));
}

/** Which way is out for a runner lined up at `z` with the ball at `ballZ`: away from the ball. */
export const outOf = (z: number, ballZ: number): 1 | -1 => (z >= ballZ ? 1 : -1);
