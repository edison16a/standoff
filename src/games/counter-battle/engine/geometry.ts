import { pieceDistance, type Piece } from "./arena";
import type { V2, V3 } from "./vec";

/**
 * Ray and segment tests against the bunkers and against fighters' hit
 * shapes. Everything is a vertical cylinder, an upright box or a sphere,
 * so the answers are exact and cheap enough to run for every pellet.
 * Directions passed in must be unit length; distances come back in metres.
 */

/** Where a ray first enters an upright cylinder from the floor to `h`, or null. */
export function rayCylinder(o: V3, d: V3, cx: number, cz: number, r: number, bottom: number, top: number): number | null {
  const ox = o.x - cx;
  const oz = o.z - cz;
  // A ray that starts inside never hits the outside of the same shape.
  if (ox * ox + oz * oz <= r * r && o.y >= bottom && o.y <= top) return null;
  let best: number | null = null;
  const a = d.x * d.x + d.z * d.z;
  if (a > 1e-12) {
    const b = ox * d.x + oz * d.z;
    const c = ox * ox + oz * oz - r * r;
    const disc = b * b - a * c;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / a;
      const y = o.y + d.y * t;
      if (t >= 0 && y >= bottom && y <= top) best = t;
    }
  }
  // The caps, for rays coming down onto the top or up from below.
  for (const capY of [top, bottom]) {
    if (Math.abs(d.y) < 1e-12) continue;
    const t = (capY - o.y) / d.y;
    if (t < 0 || (best !== null && t >= best)) continue;
    const px = ox + d.x * t;
    const pz = oz + d.z * t;
    if (px * px + pz * pz <= r * r) best = t;
  }
  return best;
}

/** Where a ray first enters an axis aligned box, or null. */
export function rayBox(o: V3, d: V3, min: V3, max: V3): number | null {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    if (Math.abs(d[axis]) < 1e-12) {
      if (o[axis] < min[axis] || o[axis] > max[axis]) return null;
      continue;
    }
    const a = (min[axis] - o[axis]) / d[axis];
    const b = (max[axis] - o[axis]) / d[axis];
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }
  if (t1 < t0 || t1 < 0 || t0 < 0) return null;
  return t0;
}

export function raySphere(o: V3, d: V3, c: V3, r: number): number | null {
  const ox = o.x - c.x;
  const oy = o.y - c.y;
  const oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  if (cc <= 0) return null;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

export function rayPiece(o: V3, d: V3, piece: Piece): number | null {
  const { shape } = piece;
  if (shape.type === "circle") return rayCylinder(o, d, piece.x, piece.z, shape.r, 0, piece.h);
  return rayBox(o, d, { x: piece.x - shape.hw, y: 0, z: piece.z - shape.hd }, { x: piece.x + shape.hw, y: piece.h, z: piece.z + shape.hd });
}

/** The first piece a ray meets within `range`, with its distance. */
export function rayPieces(o: V3, d: V3, pieces: readonly Piece[], range: number): { piece: Piece; t: number } | null {
  let best: { piece: Piece; t: number } | null = null;
  for (const piece of pieces) {
    const t = rayPiece(o, d, piece);
    if (t !== null && t <= range && (best === null || t < best.t)) best = { piece, t };
  }
  return best;
}

/** Whether any piece stands between two points in the air. */
export function sightBlocked(a: V3, b: V3, pieces: readonly Piece[]): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const l = Math.hypot(dx, dy, dz);
  if (l < 1e-9) return false;
  const d = { x: dx / l, y: dy / l, z: dz / l };
  return rayPieces(a, d, pieces, l) !== null;
}

/**
 * Whether a fighter of radius `inflate` walking the floor from a to b
 * would brush a piece. Sampled finely enough that no piece slips between
 * two samples.
 */
export function pathBlocked(a: V2, b: V2, pieces: readonly Piece[], inflate: number): boolean {
  const l = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(l / 0.15));
  for (const piece of pieces) {
    // Skip pieces nowhere near the segment's bounding box.
    const reach = (piece.shape.type === "circle" ? piece.shape.r : Math.max(piece.shape.hw, piece.shape.hd)) + inflate;
    if (piece.x + reach < Math.min(a.x, b.x) || piece.x - reach > Math.max(a.x, b.x)) continue;
    if (piece.z + reach < Math.min(a.z, b.z) || piece.z - reach > Math.max(a.z, b.z)) continue;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (pieceDistance(piece, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }) < inflate) return true;
    }
  }
  return false;
}
