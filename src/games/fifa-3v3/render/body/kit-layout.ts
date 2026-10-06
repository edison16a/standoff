import * as THREE from "three";

/**
 * Where each garment sits on a player's kit print: one texture holds
 * the shirt, the sleeves, the shorts and the socks, so the whole kit is
 * one draw. Rows are in texture space (v up, 1 at the top of the
 * canvas). The shirt gets most of the room: it carries the name and
 * the numbers, which the cameras read.
 */
export interface Region {
  /** The region's bottom and top, in v. */
  v0: number;
  v1: number;
}

export const ATLAS = {
  shirt: { v0: 0.375, v1: 1 },
  sleeve: { v0: 0.25, v1: 0.375 },
  shorts: { v0: 0.125, v1: 0.25 },
  socks: { v0: 0, v1: 0.125 },
} as const satisfies Record<string, Region>;

/** The share of the shorts' region the seat uses, at its top; the legs share the rest, the left leg on the left half. */
export const SEAT_SHARE = 0.1;

/** The torso's own span in its uvs, set from the build so the print lands at the same spot on every body. */
export interface ShirtSpan {
  /** Height of the hem and the collar over the turf, in metres. */
  hem: number;
  collar: number;
}

/** The share of the shirt's height (0 hem, 1 collar) at a height in metres. */
export const shirtV = (span: ShirtSpan, y: number) => (y - span.hem) / (span.collar - span.hem);

/**
 * Puts a piece into its region: `u` stays as the loft set it (once
 * round), between `u0` and `u1` of the width, and `v` comes from each
 * vertex's rest position through `vOf`, 0 at the bottom of the region
 * and 1 at its top.
 */
export function toAtlas(geo: THREE.BufferGeometry, region: Region, vOf: (p: THREE.Vector3) => number, u0 = 0, u1 = 1): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  // A hair inside the region's edge, so filtering never bleeds in the next garment.
  const pad = 0.004;
  for (let i = 0; i < pos.count; i++) {
    const v = Math.min(1, Math.max(0, vOf(p.fromBufferAttribute(pos, i))));
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), region.v0 + pad + v * (region.v1 - region.v0 - 2 * pad));
  }
  uv.needsUpdate = true;
  return geo;
}
