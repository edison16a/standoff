import * as THREE from "three";
import { BOWL, edge, type BowlShape } from "./bowl";

/** A point of a cross section: metres back from the bowl's front edge, and height. */
export type Profile = readonly (readonly [number, number])[];

export interface StripOptions {
  /** Steps round the bowl. */
  segments: number;
  /** Metres round the bowl per unit of u, so a texture repeats at a real size. */
  uMetres?: number;
  shape?: BowlShape;
  /** Only part of the way round, as angles. */
  from?: number;
  to?: number;
  /** Metres along the section per unit of v; without it v runs 0 to 1 over the whole section. */
  vMetres?: number;
  /** A colour for each point, by its angle round the bowl and its index in the section. */
  colour?: (t: number, k: number) => THREE.Color;
}

/**
 * Sweeps a cross section round the bowl: every ring of the stadium (the
 * terraces, the fascia boards, the suites' glass, the roof) is one of
 * these. u runs round the bowl in metres over `uMetres`, v along the
 * section from its first point to its last, so textures wrap the
 * building at a real size. Normals face the field when the section runs
 * outward and upward.
 */
export function ringStrip(profile: Profile, options: StripOptions): THREE.BufferGeometry {
  const { segments, uMetres = 1, shape = BOWL, from = 0, to = Math.PI * 2, vMetres, colour } = options;
  const positions: number[] = [];
  const uvs: number[] = [];
  const colours: number[] = [];
  const index: number[] = [];
  // v by length along the section, so a slanted part of it is not stretched.
  const lengths = [0];
  for (let i = 1; i < profile.length; i++) {
    const [o0, y0] = profile[i - 1]!;
    const [o1, y1] = profile[i]!;
    lengths.push(lengths[i - 1]! + Math.hypot(o1 - o0, y1 - y0));
  }
  const total = vMetres ?? (lengths[lengths.length - 1]! || 1);
  let around = 0;
  let last: { x: number; z: number } | null = null;
  for (let s = 0; s <= segments; s++) {
    const t = from + ((to - from) * s) / segments;
    const e = edge(shape, t);
    if (last) around += Math.hypot(e.x - last.x, e.z - last.z);
    last = e;
    profile.forEach(([out, y], k) => {
      positions.push(e.x + e.nx * out, y, e.z + e.nz * out);
      uvs.push(around / uMetres, lengths[k]! / total);
      if (colour) {
        const c = colour(t, k);
        colours.push(c.r, c.g, c.b);
      }
    });
  }
  const n = profile.length;
  for (let s = 0; s < segments; s++) {
    for (let k = 0; k < n - 1; k++) {
      const a = s * n + k;
      const b = (s + 1) * n + k;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  if (colour) geo.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * The stepped section of a deck of seats: a tread and a riser for every
 * row. Each corner is doubled, so the treads and risers keep their own
 * flat shading instead of one rounded slope.
 */
export function deckProfile(deck: { rows: number; rowDepth: number; rowRise: number; out: number; base: number }): [number, number][] {
  const p: [number, number][] = [];
  for (let r = 0; r < deck.rows; r++) {
    const o = deck.out + r * deck.rowDepth;
    const y = deck.base + r * deck.rowRise;
    // The riser from the row below ends here, then this row's tread starts on the same spot.
    if (r > 0) p.push([o, y]);
    p.push([o, y], [o + deck.rowDepth, y]);
    if (r < deck.rows - 1) p.push([o + deck.rowDepth, y]);
  }
  return p;
}
