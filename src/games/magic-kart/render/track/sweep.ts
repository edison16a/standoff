import * as THREE from "three";
import type { Track } from "../../engine/track";

/** One corner of a cross section: sideways offset and height above the road. */
export interface ProfilePoint {
  d: number;
  y: number;
  /** Rides up the ramps with the road. Skirts under a ramp set this false. */
  ramp?: boolean;
}

export interface SweepOptions {
  /** Metres between cross sections. */
  step?: number;
  /** Leave out the stretch around s, for gaps, open edges and so on. */
  skip?: (s: number) => boolean;
  /** Colour of the segment starting at s, between profile points i and i + 1. */
  color?: (s: number, i: number) => THREE.ColorRepresentation;
  /** Metres of track per texture repeat along the road. */
  uvLength?: number;
  /** Mirror the profile to the left side (d negated), for walls and kerbs on both sides. */
  bothSides?: boolean;
}

const tmp = new THREE.Color();

/**
 * Sweeps a cross section along the whole lap: the road surface, kerbs,
 * run off, barriers and the skirts under the ramps are all built this
 * way, straight from the same centre line the karts drive on. Every
 * segment gets its own vertices, so stripes stay crisp.
 */
export function sweep(track: Track, profile: readonly ProfilePoint[], options: SweepOptions = {}): THREE.BufferGeometry {
  const step = options.step ?? 1;
  const count = Math.round(track.length / step);
  const sides = options.bothSides ? [1, -1] : [1];
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];

  const at = (s: number, p: ProfilePoint, side: number) => {
    const f = track.frameAt(s);
    const d = p.d * side;
    const lift = p.ramp === false ? 0 : track.rampHeight(s);
    return [f.x + f.rx * d, f.y + lift + p.y, f.z + f.rz * d] as const;
  };

  for (let k = 0; k < count; k++) {
    const s0 = k * step;
    const s1 = (k + 1) * step;
    if (options.skip?.(s0 + step / 2)) continue;
    // Where a ramp drops away at its lip, leave the face out rather than draw a slope.
    if (track.rampHeight(s0) - track.rampHeight(s1) > 0.4) continue;
    for (const side of sides) {
      for (let i = 0; i < profile.length - 1; i++) {
        const a = profile[i]!;
        const b = profile[i + 1]!;
        const a0 = at(s0, a, side);
        const b0 = at(s0, b, side);
        const a1 = at(s1, a, side);
        const b1 = at(s1, b, side);
        // Faces point to the left of the way the profile runs (up, for a road running left to right).
        // The mirrored side runs the other way, so its winding flips.
        const quad = side > 0 ? [a0, b0, a1, b0, b1, a1] : [a0, a1, b0, b0, a1, b1];
        for (const v of quad) pos.push(...v);
        tmp.set(options.color?.(s0, i) ?? "#ffffff");
        for (let n = 0; n < 6; n++) col.push(tmp.r, tmp.g, tmp.b);
        const u0 = i / Math.max(1, profile.length - 1);
        const u1 = (i + 1) / Math.max(1, profile.length - 1);
        const v0 = s0 / (options.uvLength ?? 16);
        const v1 = s1 / (options.uvLength ?? 16);
        const uvQuad = side > 0
          ? [u0, v0, u1, v0, u0, v1, u1, v0, u1, v1, u0, v1]
          : [u0, v0, u0, v1, u1, v0, u1, v0, u0, v1, u1, v1];
        uv.push(...uvQuad);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
