import type { Piece } from "../../engine/arena";
import type { V3 } from "../../engine/vec";

/**
 * The outward direction of a bunker's surface at a point on it, so a
 * paint splat can lie flat against the side, the rounded top or the lid.
 * Pure, and tested, since a splat facing the wrong way disappears.
 */
export function surfaceNormal(piece: Piece, p: V3): V3 {
  const dx = p.x - piece.x;
  const dz = p.z - piece.z;
  // Near the top it is the lid.
  if (p.y >= piece.h - 0.02) return { x: 0, y: 1, z: 0 };
  if (piece.shape.type === "circle") {
    const l = Math.hypot(dx, dz) || 1;
    return { x: dx / l, y: 0, z: dz / l };
  }
  // A box: the face the point is closest to, measured from each face.
  const fx = piece.shape.hw - Math.abs(dx);
  const fz = piece.shape.hd - Math.abs(dz);
  const fy = piece.h - p.y;
  if (fy < fx && fy < fz) return { x: 0, y: 1, z: 0 };
  return fx < fz ? { x: Math.sign(dx) || 1, y: 0, z: 0 } : { x: 0, y: 0, z: Math.sign(dz) || 1 };
}
