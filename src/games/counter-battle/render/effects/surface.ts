import type { Piece, PieceKind } from "../../engine/arena";
import type { V3 } from "../../engine/vec";

/**
 * How far down from the top each round bunker's model rounds over, in
 * metres, as bunkers.ts builds them. The engine keeps them as plain
 * cylinders, so a ball near the top lands on the rounded shoulder.
 */
const ROUNDING: Partial<Record<PieceKind, number>> = { can: 0.3, dorito: 0.5, cake: 0.2 };

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

/** Where a splat really sits on a bunker, which way it faces, and how tightly the surface curves under it. */
export interface SurfaceHit {
  point: V3;
  normal: V3;
  /** One over the radius across the surface: 0 on anything flat. */
  curve: number;
}

/**
 * A ball's landing point moved onto the bunker as it is drawn: on a
 * round bunker's shoulder it sinks in to the curve and tips its normal
 * up with it, so the splat hugs the rounded top instead of floating.
 */
export function surfaceHit(piece: Piece, p: V3): SurfaceHit {
  const normal = surfaceNormal(piece, p);
  if (piece.shape.type !== "circle" || normal.y !== 0) return { point: p, normal, curve: 0 };
  const r = piece.shape.r;
  const k = ROUNDING[piece.kind] ?? 0;
  const below = piece.h - k;
  if (k <= 0 || p.y <= below) return { point: p, normal, curve: 1 / r };
  // Over the shoulder: a quarter circle of radius k from the side up to the flat top.
  const t = Math.min(1, (p.y - below) / k);
  const reach = r - k + k * Math.sqrt(1 - t * t);
  const up = t;
  const out = Math.sqrt(1 - t * t);
  return {
    point: { x: piece.x + normal.x * reach, y: p.y, z: piece.z + normal.z * reach },
    normal: { x: normal.x * out, y: up, z: normal.z * out },
    curve: 1 / Math.max(0.3, reach),
  };
}
