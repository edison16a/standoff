import type { MeshBuilder, V3 } from "../mesh-builder";
import { HIP_DROP } from "./rig";
import { gloss, matte, RUNNER_DIMS, satin, shadeOf, type Look } from "./runner-look";

/** How far the sole sits below the ankle joint, so the shoes stand on the ground. The legs hang a little under the hips. */
export const SOLE_DROP = RUNNER_DIMS.foot - HIP_DROP;
/** The shoes are drawn this much bigger than life, for the chunky cartoon look. */
const K = 1.14;

/** A point on the shoe, from the ground under the ankle, grown by the shoe's size. */
const p = (x: number, y: number, z: number): V3 => [x * K, -SOLE_DROP + y * K, z * K];

/**
 * A chunky white high top, toe toward -z, hung from the ankle joint: a
 * thick lime rubber sole with tread, a padded collar up the ankle, lime
 * laces over the tongue, a lime flash down each side and a red pull tab
 * at the heel, which the chase camera sees on every stride. `side` is -1
 * for the left foot, so the flash goes on the outside.
 */
export function highTop(b: MeshBuilder, detail: MeshBuilder, look: Look, side: -1 | 1): void {
  const upper = satin(look.shoes);
  const rubber = gloss(look.soles);
  // The sole: thick rubber with a darker tread underneath and a pale stripe round the midsole.
  b.box(0.172 * K, 0.062 * K, 0.335 * K, rubber, p(0, 0.033, -0.05), undefined, 0.026);
  b.box(0.15 * K, 0.012, 0.3 * K, satin(shadeOf(look.soles, 0.68)), p(0, 0.005, -0.05), undefined, 0.005);
  b.box(0.176 * K, 0.009, 0.338 * K, satin(0xf4f9e6), p(0, 0.05, -0.05));
  // The upper: a rounded body, a big round toe, the high collar and its padded rim.
  b.box(0.156 * K, 0.1 * K, 0.26 * K, upper, p(0, 0.1, -0.03), undefined, 0.045);
  b.sphere(0.08 * K, upper, p(0, 0.09, -0.135), [1, 0.72, 1.05], 16);
  b.post(0.074 * K, 0.15 * K, upper, p(0, 0.165, 0.018), 16, 0.068 * K);
  b.post(0.079 * K, 0.028 * K, satin(shadeOf(look.shoes, 0.9)), p(0, 0.235, 0.018), 16, 0.076 * K);
  // The tongue, standing up out of the laces.
  b.box(0.07 * K, 0.11 * K, 0.03 * K, upper, p(0, 0.2, -0.05), [-0.22, 0, 0], 0.014);
  // The heel counter and a red pull tab.
  b.box(0.14 * K, 0.07 * K, 0.04 * K, satin(shadeOf(look.shoes, 0.86)), p(0, 0.1, 0.085), undefined, 0.018);
  b.box(0.036 * K, 0.06 * K, 0.014 * K, satin(look.bandana), p(0, 0.25, 0.088), [0.15, 0, 0]);

  // Laces crossed up the front, and the lime flash on the outer side.
  const laces = matte(look.accent);
  for (let i = 0; i < 4; i++) {
    for (const turn of [-0.4, 0.4]) detail.box(0.075 * K, 0.012 * K, 0.014 * K, laces, p(0, 0.15 + i * 0.018, -0.135 + i * 0.026), [-0.55, turn, 0]);
  }
  detail.box(0.03 * K, 0.03 * K, 0.012 * K, laces, p(0, 0.262, -0.075), [-0.2, 0, 0]);
  for (const [y, z, len] of [[0.11, -0.03, 0.17], [0.085, -0.015, 0.13]] as const) {
    detail.box(0.008, 0.016 * K, len * K, satin(look.accent), p(side * 0.079, y, z), [0.3, 0, 0]);
  }
  // Grooves across the tread, seen each time a foot kicks up behind.
  for (let i = 0; i < 6; i++) detail.box(0.13 * K, 0.006, 0.012, satin(shadeOf(look.soles, 0.45)), p(0, 0.003, -0.17 + i * 0.05));
  // A round patch on the inside of the ankle.
  detail.post(0.026 * K, 0.006, satin(shadeOf(look.shoes, 0.8)), p(-side * 0.072, 0.18, 0.02), 12, 0.026 * K, [0, 0, Math.PI / 2]);
}
