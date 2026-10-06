import * as THREE from "three";
import type { BodyCtx } from "./context";
import { ATLAS, shirtV, toAtlas } from "./kit-layout";
import { bell, occlude, ramp, tint, type Influence, type PartList } from "./parts";
import { thighFollow } from "./legs";
import { tube, type Key } from "./profile";

/**
 * The shirt over the trunk and the neck rising out of it. The shirt is
 * one smooth shell from the hem to the collar: chest, lats tapering to
 * the waist, and shoulders rounded over the joints so the sleeves grow
 * out of them. Its print wraps from the player's left side, so a
 * quarter of the way round is the middle of the back.
 */

type Row = readonly [y: number, half: number, front: number, back: number, power: number, z: number];

/** The shirt's sections for a 1.8 m player, in metres. Widths at the shoulder come from the skeleton instead. */
const SHIRT: readonly Row[] = [
  [0.8, 0.19, 0.12, 0.134, 2.3, 0],
  [0.87, 0.182, 0.115, 0.131, 2.3, 0],
  [0.97, 0.163, 0.106, 0.118, 2.3, 0],
  [1.09, 0.16, 0.112, 0.108, 2.4, 0.002],
  [1.21, 0.172, 0.124, 0.11, 2.5, 0.006],
  [1.31, 0.183, 0.121, 0.108, 2.6, 0.004],
];

/** Over the shoulders: how far past the shoulder joint each section reaches. */
const YOKE: readonly Row[] = [
  [1.38, 0.014, 0.108, 0.102, 2.7, 0],
  [1.43, 0.038, 0.096, 0.094, 2.8, -0.004],
  [1.465, 0.026, 0.082, 0.084, 2.6, -0.008],
];

/** Up the trapezius to the collar. */
const COLLAR: readonly Row[] = [
  [1.5, 0.158, 0.074, 0.076, 2.4, -0.01],
  [1.52, 0.1, 0.068, 0.07, 2.1, -0.008],
  [1.538, 0.072, 0.063, 0.064, 2, -0.006],
];

function shirtKeys(c: BodyCtx): Key[] {
  const { s, shoulderX } = c.d;
  const key = ([y, half, f, b, power, z]: Row, w: number): Key => ({ y: y * s, l: half * w, r: half * w, f: f * s * c.deep, b: b * s * c.deep, power, z: z * s });
  return [
    ...SHIRT.map((r) => key(r, s * c.wide)),
    ...YOKE.map(([y, past, ...rest]) => key([y, shoulderX / s + past * c.wide, ...rest], s)),
    ...COLLAR.map((r) => key(r, s * (0.9 + 0.1 * c.wide))),
  ];
}

/** How each point of the shirt follows the bones: hips at the hem, the rib cage breathing, the shoulders carrying their caps. */
function shirtWeights(c: BodyCtx): (p: THREE.Vector3) => Influence {
  const { s, shoulderX } = c.d;
  const shY = c.rest.shoulderL.y;
  return (p) => {
    const ax = Math.abs(p.x);
    // Spread over the whole shoulder and down to the armpit, so a raised arm stretches the cloth evenly rather than in one fold.
    const shoulder = ramp(shoulderX - 0.1 * s, shoulderX + 0.03 * s, ax) * ramp(shY - 0.22 * s, shY - 0.03 * s, p.y);
    const low = ramp(1.07 * s, 0.93 * s, p.y);
    // The hem drapes over the front of the thighs, so a lifted knee lifts it. Behind, it hangs from the hips: a swinging leg would drag it into the body.
    // Shared between both thighs across the middle, so the hem rises as one piece of cloth rather than in notches.
    const thigh = Math.min(0.3, 0.6 * thighFollow(c, p.y)) * ramp(0.03 * s, 0.09 * s, p.z) * (1 - ramp(0.14 * s, 0.2 * s, ax));
    const left = Math.min(1, Math.max(0, 0.5 + p.x / (0.24 * s)));
    const hips = low - thigh;
    const chest = 0.75 * bell(p.y, 1.2 * s, 0.12 * s) * (1 - shoulder);
    const spine = Math.max(0, 1 - shoulder - low - chest);
    return [[p.x > 0 ? "shoulderL" : "shoulderR", shoulder], ["hips", hips], ["hipL", thigh * left], ["hipR", thigh * (1 - left)], ["chest", chest], ["spine", spine]];
  };
}

/** Light hardly reaches under the arms or inside the hem: a soft bake of those shadows. */
function shirtShade(c: BodyCtx): (p: THREE.Vector3) => number {
  const s = c.d.s;
  return (p) => {
    const ax = Math.abs(p.x);
    const pit = 0.32 * bell(p.y, 1.27 * s, 0.08 * s) * ramp(0.13 * s, 0.17 * s, ax) * (1 - ramp(0.02 * s, 0.08 * s, Math.abs(p.z)));
    const hem = 0.18 * ramp(0.86 * s, 0.8 * s, p.y);
    return Math.min(0.5, pit + hem);
  };
}

export function addShirt(kit: PartList, c: BodyCtx): void {
  const s = c.d.s;
  const shirt = tube(shirtKeys(c), { n: c.n + 8, step: c.step, a0: Math.PI / 2 });
  toAtlas(shirt, ATLAS.shirt, (p) => shirtV(c.span, p.y));
  occlude(tint(shirt, "#ffffff"), shirtShade(c));
  kit.weighted(shirt, shirtWeights(c));
  // A ribbed collar round the neck, in the shirt's top band, which is printed in the trim.
  const collar = new THREE.TorusGeometry(0.067 * s, 0.0085 * s, c.fine ? 8 : 4, c.n);
  collar.rotateX(Math.PI / 2);
  collar.scale(0.98 + 0.06 * (c.wide - 1), 1, 1.02);
  collar.translate(0, 1.533 * s, -0.006 * s);
  toAtlas(collar, ATLAS.shirt, () => 0.99);
  kit.weighted(tint(collar, "#ffffff"), () => [["spine", 0.85], ["neck", 0.15]]);
}

/** The neck, from inside the collar up into the head, with a hint of the Adam's apple. */
export function addNeck(skin: PartList, c: BodyCtx, tone: string): void {
  const s = c.d.s;
  const w = s * (0.92 + 0.22 * c.d.b);
  const rows: readonly (readonly [number, number, number, number])[] = [
    [1.46, 0.07, 0.064, 0.07],
    [1.52, 0.064, 0.06, 0.066],
    [1.575, 0.058, 0.058, 0.06],
    [1.62, 0.055, 0.05, 0.058],
    [1.675, 0.052, 0.044, 0.052],
  ];
  const keys: Key[] = rows.map(([y, half, f, b]) => ({ y: y * s, l: half * w, r: half * w, f: f * w, b: b * w, z: -0.006 * s }));
  const neck = tube(keys, { n: c.nSmall + 4, step: c.step });
  occlude(tint(neck, tone), (p) => 0.32 * ramp(1.55 * s, 1.5 * s, p.y) + 0.22 * ramp(1.6 * s, 1.66 * s, p.y) * ramp(-0.01 * s, 0.04 * s, p.z));
  const neckY = c.rest.neck.y;
  skin.weighted(neck, (p) => {
    const up = ramp(neckY - 0.02 * s, neckY + 0.07 * s, p.y);
    return [["spine", 1 - up], ["neck", up]];
  });
}
