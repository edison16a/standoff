import { attackSign, type TeamId } from "../teams";
import { FIELD } from "./field";
import type { Rng } from "./rng";
import type { RouteKind, RouteState } from "./route-types";
import { add, clamp, dist, norm, sub, type Vec2 } from "./vec";

/**
 * Each route as breaks in yards: downfield from the line, then outward
 * toward the receiver's own sideline (negative cuts back inside).
 */
const SHAPES: Record<RouteKind, readonly [number, number][]> = {
  slant: [[2, 0], [9, -6]],
  go: [[4, 0.6], [45, 1]],
  out: [[6, 0], [6.5, 9]],
  curl: [[11, 0], [9, -1]],
  drag: [[1.5, 0], [3, -20]],
  post: [[10, 0], [24, -9]],
};

/** A pair of routes for the two runners, drawn up to stretch a defence both ways. */
export const PLAYBOOK: readonly (readonly [RouteKind, RouteKind])[] = [
  ["slant", "go"],
  ["out", "curl"],
  ["drag", "post"],
  ["curl", "go"],
  ["go", "out"],
  ["slant", "drag"],
  ["post", "curl"],
  ["go", "go"],
];

export function pickPlay(rng: Rng): readonly [RouteKind, RouteKind] {
  return rng.pick(PLAYBOOK);
}

/** Keeps a route point a step inside the sidelines and the back of the end zone. */
function onField(p: Vec2): Vec2 {
  return { x: clamp(p.x, -FIELD.endLine + 1, FIELD.endLine - 1), z: clamp(p.z, -FIELD.halfWidth + 1.2, FIELD.halfWidth - 1.2) };
}

/** Lays a route on the field for a runner starting at `start`, for a team snapping at `los` with the ball at `ballZ`. */
export function layRoute(kind: RouteKind, team: TeamId, los: number, ballZ: number, start: Vec2): RouteState {
  const s = attackSign(team);
  const out = start.z === ballZ ? (start.z >= 0 ? 1 : -1) : Math.sign(start.z - ballZ);
  const points = SHAPES[kind].map(([d, o]) => onField({ x: los + s * d, z: start.z + out * o }));
  return { kind, points, next: 0, settle: kind === "curl" };
}

/**
 * Where a computer runner heads on its route this step: the next break,
 * and once the last is passed, on along the last leg (or sitting down in
 * a curl). Returns null when the runner should stand still.
 */
export function routeTarget(route: RouteState, pos: Vec2): Vec2 | null {
  while (route.next < route.points.length && dist(pos, route.points[route.next]!) < 1.1) route.next++;
  const target = route.points[route.next];
  if (target) return target;
  if (route.settle) return null;
  const last = route.points[route.points.length - 1]!;
  const prev = route.points[route.points.length - 2] ?? pos;
  return onField(add(last, norm(sub(last, prev)), 30));
}

/** Whether a runner has finished breaking and is running the route out. */
export function routeDone(route: RouteState): boolean {
  return route.next >= route.points.length;
}
