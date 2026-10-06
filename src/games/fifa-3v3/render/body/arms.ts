import type * as THREE from "three";
import type { BodyCtx } from "./context";
import { ATLAS, toAtlas } from "./kit-layout";
import { occlude, ramp, tint, type Influence, type PartList } from "./parts";
import { tube, type Key } from "./profile";
import type { BoneName } from "./rig";

/**
 * Both arms: the sleeve, and the arm itself in one smooth piece from
 * under the sleeve to the wrist, bending at the elbow. At rest the arms
 * hang with the palms in, so the biceps face forward, the point of the
 * elbow back, and the wrist is deeper than it is wide.
 */

type Row = readonly [dy: number, outer: number, inner: number, front: number, back: number];

/** The bare arm below the shoulder joint, for a 1.8 m player of middling build. */
const ARM: readonly Row[] = [
  [-0.04, 0.05, 0.048, 0.052, 0.05],
  [-0.11, 0.047, 0.044, 0.052, 0.047],
  [-0.19, 0.043, 0.04, 0.045, 0.046],
  [-0.26, 0.037, 0.036, 0.035, 0.041],
  [-0.29, 0.035, 0.035, 0.033, 0.042],
  [-0.32, 0.039, 0.036, 0.037, 0.04],
  [-0.37, 0.041, 0.036, 0.039, 0.037],
  [-0.45, 0.031, 0.028, 0.03, 0.029],
  [-0.51, 0.021, 0.021, 0.028, 0.028],
  [-0.55, 0.019, 0.019, 0.026, 0.026],
];

/** A short sleeve: loose over the deltoid, a touch of flare at the hem. */
const SLEEVE: readonly Row[] = [
  [-0.035, 0.064, 0.06, 0.064, 0.064],
  [-0.08, 0.063, 0.058, 0.063, 0.062],
  [-0.14, 0.06, 0.056, 0.06, 0.059],
  [-0.168, 0.062, 0.058, 0.062, 0.061],
];

/** A keeper's long sleeve, padded at the elbow, gathered into a cuff at the wrist. */
const LONG_SLEEVE: readonly Row[] = [
  [-0.035, 0.066, 0.062, 0.066, 0.066],
  [-0.12, 0.059, 0.055, 0.061, 0.058],
  [-0.21, 0.053, 0.05, 0.054, 0.053],
  [-0.29, 0.05, 0.048, 0.048, 0.054],
  [-0.36, 0.05, 0.046, 0.049, 0.048],
  [-0.46, 0.04, 0.037, 0.039, 0.038],
  [-0.53, 0.034, 0.033, 0.036, 0.036],
  [-0.545, 0.033, 0.032, 0.035, 0.035],
];

function keys(rows: readonly Row[], c: BodyCtx, side: 1 | -1, bulk: number): Key[] {
  const { s } = c.d;
  const top = c.rest.shoulderL.y;
  return rows.map(([dy, outer, inner, f, b]) => ({
    y: top + dy * s,
    l: (side > 0 ? outer : inner) * s * bulk,
    r: (side > 0 ? inner : outer) * s * bulk,
    f: f * s * bulk,
    b: b * s * bulk,
    x: side * c.d.shoulderX,
  }));
}

/** The upper arm rides the shoulder; below the elbow the forearm rides the elbow, blended across the joint. */
function armWeights(c: BodyCtx, side: 1 | -1): (p: THREE.Vector3) => Influence {
  const elbowY = c.rest.elbowL.y;
  const w = 0.035 * c.d.s;
  const sh: BoneName = side > 0 ? "shoulderL" : "shoulderR";
  const el: BoneName = side > 0 ? "elbowL" : "elbowR";
  return (p) => {
    const lower = ramp(elbowY + w, elbowY - w, p.y);
    return [[sh, 1 - lower], [el, lower]];
  };
}

export function addArms(skin: PartList, kit: PartList, c: BodyCtx, tone: string): void {
  const { s, b } = c.d;
  const bulk = 0.88 + 0.26 * b;
  const top = c.rest.shoulderL.y;
  const hemY = top - 0.168 * s;
  for (const side of [1, -1] as const) {
    // The seam of each tube runs down the inside of the arm, against the body.
    const a0 = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const rows = c.keeper ? LONG_SLEEVE : SLEEVE;
    const sleeve = tube(keys(rows, c, side, 0.93 + 0.12 * b), { n: c.nSmall + 6, step: c.step, capStart: 0.045 * s, a0 });
    const bottom = top + rows[rows.length - 1]![0] * s;
    toAtlas(sleeve, ATLAS.sleeve, (p) => (p.y - bottom) / (top - bottom));
    occlude(tint(sleeve, "#ffffff"), (p) => 0.2 * ramp(bottom + 0.03 * s, bottom, p.y));
    kit.weighted(sleeve, armWeights(c, side));
    if (c.keeper) continue;
    const arm = tube(keys(ARM, c, side, bulk), { n: c.nSmall, step: c.step, a0 });
    // A soft shadow just under the sleeve's hem and in the crook of the elbow.
    const elbowY = c.rest.elbowL.y;
    occlude(tint(arm, tone), (p) => 0.35 * ramp(hemY - 0.05 * s, hemY, p.y) + 0.12 * ramp(0.01 * s, 0.035 * s, p.z) * Math.exp(-(((p.y - elbowY) / (0.03 * s)) ** 2)));
    skin.weighted(arm, armWeights(c, side));
  }
}
