import type { Aim, Vec } from "./shots";

/** How far the picture reaches sideways per metre of depth, for a vertical field of view in degrees. */
export function sideReach(fov: number, aspect: number): number {
  return Math.tan((fov * Math.PI) / 360) * aspect;
}

/**
 * Pulls the camera straight back along its line of sight, keeping the
 * same tilt and the same point in the middle of the picture, until every
 * point the shot wants to keep sits inside the frame side to side. A wide
 * formation or a narrow screen backs the camera up; a tight shot leaves
 * it alone. `margin` keeps points off the very edge.
 */
export function fitWidth(aim: Aim, aspect: number, margin = 0.85, maxPull = 16): Aim {
  const keep = aim.keep;
  if (!keep || keep.length === 0) return aim;
  const dir = sub(aim.look, aim.pos);
  const len = Math.hypot(dir.x, dir.y, dir.z);
  if (len < 1e-3) return aim;
  dir.x /= len;
  dir.y /= len;
  dir.z /= len;
  // Right across the picture: the line of sight crossed with up, flattened.
  const flat = Math.hypot(dir.x, dir.z) || 1;
  const right = { x: -dir.z / flat, z: dir.x / flat };
  const reach = sideReach(aim.fov, aspect) * margin;
  let pull = 0;
  for (const p of keep) {
    const r = sub(p, aim.pos);
    const depth = r.x * dir.x + r.y * dir.y + r.z * dir.z;
    const side = Math.abs(r.x * right.x + r.z * right.z);
    pull = Math.max(pull, side / reach - depth);
  }
  pull = Math.min(maxPull, pull);
  if (pull <= 0) return aim;
  return { ...aim, pos: { x: aim.pos.x - dir.x * pull, y: aim.pos.y - dir.y * pull, z: aim.pos.z - dir.z * pull } };
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
