import type { Vec2 } from "./vec";

export type RouteKind = "slant" | "go" | "out" | "curl" | "drag" | "post";

export const ROUTE_KINDS: readonly RouteKind[] = ["slant", "go", "out", "curl", "drag", "post"];

/** A route laid out on the field for one play. */
export interface RouteState {
  kind: RouteKind;
  /** The breaks of the route on the field, in order. */
  points: Vec2[];
  /** The next point to run to. Past the last one the route is run out. */
  next: number;
  /** A curl sits down and turns to the quarterback at its end instead of running on. */
  settle: boolean;
}
