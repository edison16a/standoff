import { span, type TracePoint } from "./trace";
import { HALF } from "./tuning";

/**
 * A portal's frame: the ring's opening, and the walls that close every
 * way around it, as in the original, so no run can pass over or under a
 * portal. The opening is placed around the path the perfect run takes,
 * with room to spare for a jump a little early or late.
 */

/** The ring is at least this tall, so it reads as a portal and not a slot. */
export const RING_MIN = 3.4;
/** Room between the perfect run and the frame, for jumps off the beat. */
const MARGIN = 0.8;
/** How far either side of the portal the run's height is checked. */
const REACH = 1.3;
/** An opening this close to the floor or ceiling reaches it, rather than leave a sliver of wall. */
const SNAP = 0.6;
/** Walls in open sky rise this high, far above anything a run can reach. */
export const WALL_TOP = 30;

export interface PortalFrame {
  bottom: number;
  top: number;
  /** Solid walls closing the column below and above the opening, as x, y, width and height. */
  walls: { x: number; y: number; w: number; h: number }[];
}

/**
 * The frame for a portal at x, from the perfect run's path. `roof` is the
 * lower of the ceilings meeting at the portal, or null for open sky.
 */
export function portalFrame(points: readonly TracePoint[], x: number, roof: number | null): PortalFrame {
  const around = span(points, x - REACH, x + REACH);
  if (!around) throw new Error(`no path past the portal at x ${x.toFixed(1)}`);
  let bottom = around.low - HALF - MARGIN;
  let top = around.high + HALF + MARGIN;
  if (top - bottom < RING_MIN) {
    const middle = (bottom + top) / 2;
    bottom = middle - RING_MIN / 2;
    top = middle + RING_MIN / 2;
  }
  // Keep the opening between the floor and the roof, sliding it rather than squashing it.
  if (bottom < SNAP) {
    top += Math.max(0, -bottom);
    bottom = 0;
  }
  if (roof !== null && top > roof - SNAP) {
    bottom = Math.max(0, bottom - Math.max(0, top - roof));
    top = roof;
  }
  const walls: PortalFrame["walls"] = [];
  if (bottom > 0) walls.push({ x: x - 0.5, y: 0, w: 1, h: bottom });
  const ceiling = roof ?? WALL_TOP;
  if (top < ceiling) walls.push({ x: x - 0.5, y: top, w: 1, h: ceiling - top });
  return { bottom, top, walls };
}
