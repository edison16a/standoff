import type * as THREE from "three";
import type { BodyCtx } from "./context";
import { ATLAS, SEAT_SHARE, toAtlas } from "./kit-layout";
import { occlude, ramp, tint, type Influence, type PartList } from "./parts";
import { thighFollow } from "./legs";
import { tube, type Key } from "./profile";

/**
 * The shorts: a seat round the pelvis and two loose legs flaring a
 * little to the hem. The waistband hides under the shirt. The legs
 * follow the thighs exactly as the skin under them does.
 */

type Row = readonly [y: number, outer: number, inner: number, front: number, back: number];

const SEAT: readonly Row[] = [
  [1.0, 0.15, 0.15, 0.094, 0.104],
  [0.93, 0.168, 0.168, 0.1, 0.118],
  [0.86, 0.177, 0.177, 0.102, 0.124],
  [0.8, 0.179, 0.179, 0.1, 0.12],
];

// Up under the shirt the legs stay inside it, so a broad build never pushes the shorts out through the hem.
const LEG: readonly Row[] = [
  [0.86, 0.064, 0.06, 0.075, 0.09],
  [0.8, 0.081, 0.076, 0.09, 0.1],
  [0.7, 0.092, 0.082, 0.099, 0.1],
  [0.61, 0.093, 0.083, 0.097, 0.097],
];

const HEM = 0.61;
const WAIST = 1.0;

/** The seat sizes with the build's hips; the legs with its thighs, which they must cover. */
function keys(rows: readonly Row[], c: BodyCtx, side: 1 | -1, x: number, thighs = false): Key[] {
  const s = c.d.s;
  const bulk = 0.88 + 0.26 * c.d.b;
  const w = s * (thighs ? bulk : c.wide);
  const d = s * (thighs ? bulk : c.deep);
  return rows.map(([y, outer, inner, f, b]) => ({ y: y * s, l: (side > 0 ? outer : inner) * w, r: (side > 0 ? inner : outer) * w, f: f * d, b: b * d, x }));
}

export function addShorts(kit: PartList, c: BodyCtx): void {
  const s = c.d.s;
  const v = (p: THREE.Vector3) => (p.y - HEM * s) / ((WAIST - HEM) * s);
  const seat = tube(keys(SEAT, c, 1, 0), { n: c.n, step: c.step, capEnd: 0.045 * s, a0: Math.PI / 2 });
  toAtlas(seat, { v0: ATLAS.shorts.v1 - SEAT_SHARE * (ATLAS.shorts.v1 - ATLAS.shorts.v0), v1: ATLAS.shorts.v1 }, () => 0.5);
  occlude(tint(seat, "#ffffff"), (p) => 0.25 * ramp(0.8 * s, 0.76 * s, p.y));
  kit.weighted(seat, (p): Influence => {
    // Low down, and over the front of each thigh, the seat moves with the leg under it.
    const low = Math.min(0.6, 0.35 * ramp(0.84 * s, 0.76 * s, p.y) + 0.2 * ramp(0.92 * s, 0.8 * s, p.y) * ramp(0.03 * s, 0.08 * s, p.z));
    // Shared between the legs across the middle, so one leg lifting does not tear the crotch apart.
    const left = Math.min(1, Math.max(0, 0.5 + p.x / (0.14 * s)));
    return [["hips", 1 - low], ["hipL", low * left], ["hipR", low * (1 - left)]];
  });
  const legs = { v0: ATLAS.shorts.v0, v1: ATLAS.shorts.v1 - SEAT_SHARE * (ATLAS.shorts.v1 - ATLAS.shorts.v0) };
  for (const side of [1, -1] as const) {
    const leg = tube(keys(LEG, c, side, side * c.d.hipW * 1.05, true), { n: c.nSmall + 8, step: c.step, a0: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    // Each leg prints from its own half of the region: its inside seam first, so the outer stripe lands mid way.
    toAtlas(leg, legs, v, side > 0 ? 0 : 0.5, side > 0 ? 0.5 : 1);
    occlude(tint(leg, "#ffffff"), (p) => 0.22 * ramp(0.8 * s, 0.86 * s, p.y) + 0.15 * ramp(HEM * s + 0.03 * s, HEM * s, p.y));
    const hip = side > 0 ? "hipL" : "hipR";
    kit.weighted(leg, (p): Influence => {
      // Up under the shirt at the back, the shorts trail the thigh less, so a leg swung back for a kick stays under the hem.
      const tucked = ramp(0.03 * s, -0.09 * s, p.z) * ramp(HEM * s, (HEM + 0.09) * s, p.y);
      const follow = thighFollow(c, p.y) * (1 - 0.45 * tucked);
      return [["hips", 1 - follow], [hip, follow]];
    });
  }
}
