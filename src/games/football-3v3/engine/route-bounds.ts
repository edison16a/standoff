import { FIELD, YARD } from "./field";
import { clamp, type V2 } from "./vec";

/**
 * Where a computer route runner may go. A ball thrown to a man out of
 * bounds is incomplete (catch/outcome.ts), so a route that drifts over
 * the sideline or out the back of the end zone wastes him. Waypoints are
 * laid inside these edges, and his stick is bent back in near them.
 */
export const ROUTE_EDGE = {
  /** Waypoints stay this far inside the sidelines. */
  side: FIELD.halfWidth - 1.5,
  /** The numbers, about twelve yards in from the sideline: the deep route's lane. */
  numbers: FIELD.halfWidth - 12 * YARD,
  /** Waypoints stay this far short of the end line. */
  end: FIELD.endX - 1.5,
  /** Inside this many metres of a line he starts to bend along it. */
  bend: 4,
  /** Inside this many metres (or over the line) he turns back in. */
  safe: 1.2,
} as const;

/** A waypoint pulled inside the end lines and within `side` metres of the middle across. */
export const insideRoute = (p: V2, side: number = ROUTE_EDGE.side): V2 => ({
  x: clamp(p.x, -ROUTE_EDGE.end, ROUTE_EDGE.end),
  z: clamp(p.z, -side, side),
});

/**
 * Bends one stick axis away from a line. `along` is the stick toward the
 * line, `across` the other axis, `room` the metres left to the line
 * (negative past it) and `drift` the way to slide along it when the
 * stick gives none. Near the line the push toward it fades and moves
 * into `across`, so he keeps his speed and runs along the line; at it,
 * or over it, he heads back in at an angle that steepens the further out
 * he is.
 */
function bend(along: number, across: number, room: number, drift: number): [number, number] {
  const len = Math.hypot(along, across);
  if (room >= ROUTE_EDGE.bend || len < 1e-6) return [along, across];
  const slide = Math.abs(across) > len * 0.1 ? Math.sign(across) : drift;
  if (room <= ROUTE_EDGE.safe) {
    const back = clamp((ROUTE_EDGE.safe - room) / ROUTE_EDGE.safe, 0.35, 1);
    const speed = Math.max(len, 0.6);
    return [-back * speed, slide * Math.sqrt(1 - back * back) * speed];
  }
  if (along <= 0) return [along, across];
  const kept = along * ((room - ROUTE_EDGE.safe) / (ROUTE_EDGE.bend - ROUTE_EDGE.safe));
  return [kept, slide * Math.sqrt(Math.max(0, len * len - kept * kept))];
}

/**
 * A route runner's stick, kept in bounds. `at` is where he stands,
 * `goal` the stick his route asks for and `sign` the way his team
 * attacks. Running at a sideline he turns upfield along it; at the end
 * line he turns across toward the middle; and a man already over either
 * line comes straight back in, so he can still be thrown to.
 */
export function keepGoalInside(at: V2, goal: V2, sign: 1 | -1): V2 {
  const outZ = at.z >= 0 ? 1 : -1;
  const [toSide, upfield] = bend(goal.z * outZ, goal.x * sign, FIELD.halfWidth - Math.abs(at.z), 1);
  let x = upfield * sign;
  let z = toSide * outZ;
  // Only the end line he is running at matters; the one behind him is the QB's problem.
  if (at.x * sign > 0) {
    const outX = sign;
    const [toEnd, across] = bend(x * outX, z * -outZ, FIELD.endX - Math.abs(at.x), 1);
    x = toEnd * outX;
    z = across * -outZ;
  }
  return { x, z };
}
