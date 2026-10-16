import { ROUTE_EDGE } from "../route-bounds";
import type { V2 } from "../vec";

/** Legs shorter than this, metres, are dropped: a clipped corner that lands on the next point adds nothing. */
const TINY = 0.05;

/** Where the leg from `a` to `b` first meets the box, as a share of the leg, or 1 when it stays inside. */
function reach(a: V2, b: V2, side: number, end: number): number {
  let k = 1;
  for (const [from, to, edge] of [[a.z, b.z, side], [a.z, b.z, -side], [a.x, b.x, end], [a.x, b.x, -end]] as const) {
    const out = edge > 0 ? to > edge : to < edge;
    if (out && to !== from) k = Math.min(k, Math.max(0, (edge - from) / (to - from)));
  }
  return k;
}

const inside = (p: V2, side: number, end: number): V2 => ({
  x: Math.max(-end, Math.min(end, p.x)),
  z: Math.max(-side, Math.min(side, p.z)),
});

/**
 * Lays a route's points on the field, inside the edges a runner may go
 * (route-bounds.ts). A leg that would cross an edge is cut where it
 * meets it and carries on along it, so a corner route that runs out of
 * room turns straight up the sideline. Every leg stays a straight line
 * with a sharp corner, the way the card draws it, instead of a waypoint
 * pulled in on its own that bends the leg before it into a drift. Pure.
 */
export function layLegs(start: V2, targets: readonly V2[], side: number = ROUTE_EDGE.side, end: number = ROUTE_EDGE.end): V2[] {
  const out: V2[] = [];
  let at = inside(start, side, end);
  for (const t of targets) {
    const k = reach(at, t, side, end);
    if (k < 1) {
      const cut = { x: at.x + (t.x - at.x) * k, z: at.z + (t.z - at.z) * k };
      if (Math.hypot(cut.x - at.x, cut.z - at.z) > TINY) out.push(cut);
      at = cut;
    }
    const p = inside(t, side, end);
    if (Math.hypot(p.x - at.x, p.z - at.z) > TINY || out.length === 0) out.push(p);
    at = p;
  }
  return out;
}
