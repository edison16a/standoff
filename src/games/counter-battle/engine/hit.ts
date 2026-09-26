import type { Piece } from "./arena";
import type { Trace } from "./events";
import { hitShape, type Fighter } from "./fighter";
import { rayCylinder, rayPieces, raySphere } from "./geometry";
import { BODY } from "./tuning";
import type { V3 } from "./vec";

/** Bullets stop here, well past the far end of the field. */
export const MAX_RANGE = 140;

export interface RayHit {
  t: number;
  trace: Trace;
}

/**
 * Where a fighter's ray first meets a head, a body, a bunker or the floor.
 * A head is only a head shot if the ray meets it before the body, so a
 * shot through the chest never counts as one.
 */
export function rayFighter(o: V3, d: V3, f: Fighter): { t: number; head: boolean } | null {
  const shape = hitShape(f);
  const head = raySphere(o, d, shape.head, BODY.headRadius);
  const body = rayCylinder(o, d, f.pos.x, f.pos.z, BODY.radius, 0, shape.top);
  if (head !== null && (body === null || head <= body)) return { t: head, head: true };
  if (body !== null) return { t: body, head: false };
  return null;
}

/** Casts one bullet. `self` is the shooter, who can never hit themself. */
export function castRay(o: V3, d: V3, pieces: readonly Piece[], fighters: readonly Fighter[], self: number, range = MAX_RANGE): RayHit {
  let best: RayHit = { t: range, trace: { to: along(o, d, range), hit: { type: "none" } } };
  if (d.y < -1e-9) {
    const t = -o.y / d.y;
    if (t < best.t) best = { t, trace: { to: along(o, d, t), hit: { type: "floor" } } };
  }
  const cover = rayPieces(o, d, pieces, best.t);
  if (cover) best = { t: cover.t, trace: { to: along(o, d, cover.t), hit: { type: "cover", piece: cover.piece.id } } };
  for (const f of fighters) {
    if (f.id === self || !f.alive) continue;
    const hit = rayFighter(o, d, f);
    if (hit && hit.t < best.t) best = { t: hit.t, trace: { to: along(o, d, hit.t), hit: { type: "fighter", id: f.id, head: hit.head } } };
  }
  return best;
}

export function along(o: V3, d: V3, t: number): V3 {
  return { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t };
}
