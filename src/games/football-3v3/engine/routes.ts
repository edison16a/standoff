import type { Rng } from "./rng";
import { YARD } from "./field";
import { insideRoute, ROUTE_EDGE } from "./route-bounds";
import type { V2 } from "./vec";

/** The routes a computer receiver runs. */
export const ROUTES = ["slant", "go", "out", "curl", "drag", "post"] as const;
export type RouteKind = (typeof ROUTES)[number];

/**
 * Each route as yards downfield and yards out toward the receiver's own
 * sideline (negative is back across the field), from where they line up.
 * The receiver runs the legs in turn and keeps going the way the last
 * one points, except on a curl, where they settle and face the QB.
 */
const SHAPES: Record<RouteKind, readonly [number, number][]> = {
  go: [[5, 0.5], [45, 2]],
  slant: [[2, 0], [9, -6], [30, -20]],
  out: [[8, 0], [8.5, 14]],
  curl: [[11, 0], [9, -1.5]],
  drag: [[2, -2], [4.5, -28]],
  post: [[11, 0], [35, -14]],
};

export const STOPS: ReadonlySet<RouteKind> = new Set(["curl"]);

/**
 * The deep threat's go route: straight up the field with a slight fade
 * toward his sideline, held inside the numbers so the ball has room.
 */
const DEEP: readonly [number, number][] = [[4, 0.3], [15, 1.2], [45, 3]];

const lay = (shape: readonly [number, number][], start: V2, sign: 1 | -1, side?: number): V2[] => {
  const out = start.z >= 0 ? 1 : -1;
  return shape.map(([down, wide]) => insideRoute({ x: start.x + sign * down * YARD, z: start.z + out * wide * YARD }, side));
};

/**
 * The route's waypoints on the ground for a receiver lined up at `start`,
 * attacking toward `sign` along x. Waypoints stay a safe margin inside
 * the sidelines and the end line (route-bounds.ts).
 */
export const routePoints = (kind: RouteKind, start: V2, sign: 1 | -1): V2[] => lay(SHAPES[kind], start, sign);

/** The deep threat's go route, never wider than the numbers unless he lined up wider. */
export const deepRoute = (start: V2, sign: 1 | -1): V2[] => lay(DEEP, start, sign, Math.max(ROUTE_EDGE.numbers, Math.min(ROUTE_EDGE.side, Math.abs(start.z))));

/** Two receivers never run the same route on one play. */
export function callRoutes(rng: Rng, count: number): RouteKind[] {
  const pool = [...ROUTES];
  const picks: RouteKind[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const at = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(at, 1)[0]!);
  }
  return picks;
}
