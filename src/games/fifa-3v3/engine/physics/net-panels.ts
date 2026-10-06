import { PITCH } from "../tuning";
import type { Vec3 } from "../vec";

const HL = PITCH.halfLength;
const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const GD = PITCH.goalDepth;

export type PanelId = "back" | "left" | "right" | "roof";

/** Each sheet's size: `w` along u and `h` along v. */
export const PANELS: Record<PanelId, { w: number; h: number }> = {
  back: { w: GW * 2, h: GH },
  left: { w: GD, h: GH },
  right: { w: GD, h: GH },
  roof: { w: GD, h: GW * 2 },
};

/** A point seen from one sheet: where on it (u, v), how far out of the goal past it (s), and its outward normal. */
export interface PanelPoint {
  u: number;
  v: number;
  s: number;
  normal: Vec3;
}

/**
 * Where a point lies against one sheet of the goal at `end` (-1 for the
 * left goal). Depth runs from the goal line back into the net. Left and
 * right are as the pitch's z runs, not as a keeper sees them.
 */
export function panelFrame(id: PanelId, end: -1 | 1, p: Vec3): PanelPoint {
  const d = end * p.x - HL;
  switch (id) {
    case "back":
      return { u: p.z + GW, v: p.y, s: d - GD, normal: { x: end, y: 0, z: 0 } };
    case "left":
      return { u: d, v: p.y, s: -p.z - GW, normal: { x: 0, y: 0, z: -1 } };
    case "right":
      return { u: d, v: p.y, s: p.z - GW, normal: { x: 0, y: 0, z: 1 } };
    case "roof":
      return { u: d, v: p.z + GW, s: p.y - GH, normal: { x: 0, y: 1, z: 0 } };
  }
}

/** The point on a sheet at (u, v), pushed `s` out of the goal: the inverse of panelFrame, for drawing. */
export function panelPoint(id: PanelId, end: -1 | 1, u: number, v: number, s: number): Vec3 {
  switch (id) {
    case "back":
      return { x: end * (HL + GD + s), y: v, z: u - GW };
    case "left":
      return { x: end * (HL + u), y: v, z: -GW - s };
    case "right":
      return { x: end * (HL + u), y: v, z: GW + s };
    case "roof":
      return { x: end * (HL + u), y: GH + s, z: v - GW };
  }
}
