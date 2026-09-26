import type { Piece } from "../../engine/arena";
import type { Fighter } from "../../engine/fighter";
import { castRay, MAX_RANGE } from "../../engine/hit";
import type { V3 } from "../../engine/vec";

/** A camera's pose: where it is, which way it looks and its lens. Yaw 0 looks along +z, pitch up is positive. */
export interface CameraPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Width over height of the pane it draws into. */
  aspect: number;
}

/** A point in a pane: x from -1 (left edge) to 1, y from -1 (bottom) to 1, like the aim kit sends. */
export interface PanePoint {
  x: number;
  y: number;
}

/** The camera's forward, right and up directions. */
export function cameraAxes(c: CameraPose): { f: V3; r: V3; u: V3 } {
  const cp = Math.cos(c.pitch);
  const f = { x: Math.sin(c.yaw) * cp, y: Math.sin(c.pitch), z: Math.cos(c.yaw) * cp };
  // Facing +z, the right hand side is -x.
  const r = { x: -Math.cos(c.yaw), y: 0, z: Math.sin(c.yaw) };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  return { f, r, u };
}

/** The unit direction from the camera through a point of its pane. */
export function paneRay(c: CameraPose, p: PanePoint): V3 {
  const { f, r, u } = cameraAxes(c);
  const t = Math.tan((c.fov * Math.PI) / 360);
  const x = p.x * t * c.aspect;
  const y = p.y * t;
  const d = { x: f.x + r.x * x + u.x * y, y: f.y + r.y * x + u.y * y, z: f.z + r.z * x + u.z * y };
  const l = Math.hypot(d.x, d.y, d.z);
  return { x: d.x / l, y: d.y / l, z: d.z / l };
}

/** Where a world point falls in the pane, or null if it is behind the camera. The inverse of paneRay. */
export function toPane(c: CameraPose, w: V3): PanePoint | null {
  const { f, r, u } = cameraAxes(c);
  const d = { x: w.x - c.x, y: w.y - c.y, z: w.z - c.z };
  const depth = d.x * f.x + d.y * f.y + d.z * f.z;
  if (depth <= 1e-4) return null;
  const t = Math.tan((c.fov * Math.PI) / 360);
  return { x: (d.x * r.x + d.y * r.y + d.z * r.z) / depth / (t * c.aspect), y: (d.x * u.x + d.y * u.y + d.z * u.z) / depth / t };
}

/**
 * What a player is pointing at: the first bunker, fighter or bit of
 * floor on the ray through their point of the pane, or a far point along
 * it. Handing this to Battle.aimAt aims the gun from the fighter's own
 * eye at exactly what the crosshair covers.
 */
export function aimTarget(c: CameraPose, p: PanePoint, pieces: readonly Piece[], fighters: readonly Fighter[], self: number): V3 {
  const d = paneRay(c, p);
  return castRay({ x: c.x, y: c.y, z: c.z }, d, pieces, fighters, self, MAX_RANGE).trace.to;
}
