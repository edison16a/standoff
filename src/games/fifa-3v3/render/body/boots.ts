import * as THREE from "three";
import type { BodyCtx } from "./context";
import { egg, loft } from "./loft";
import { join, place, roughen, tint, type PartList } from "./parts";

/**
 * Football boots, built in the ankle's frame (toe down +z): a low cut
 * upper over a slim last, a knitted collar the sock disappears into,
 * laces over the instep, a sweeping stripe down each side, a stiff
 * soleplate and the studs under it, which show on every slide and kick.
 * The soleplate's underside is where the turf check expects it (figures/turf.ts).
 */

type Row = readonly [z: number, half: number, top: number, bottom: number, power: number];

const UPPER: readonly Row[] = [
  [-0.066, 0.024, 0.018, -0.058, 2.2],
  [-0.055, 0.034, 0.034, -0.067, 2.4],
  [-0.03, 0.039, 0.03, -0.07, 2.5],
  [0, 0.041, 0.012, -0.071, 2.6],
  [0.04, 0.044, -0.008, -0.072, 2.6],
  [0.08, 0.047, -0.024, -0.072, 2.7],
  [0.12, 0.046, -0.034, -0.072, 2.7],
  [0.16, 0.04, -0.043, -0.071, 2.6],
  [0.19, 0.029, -0.051, -0.069, 2.4],
];

function rings(rows: readonly Row[], n: number, s: number, step: number, grow = 0): THREE.Vector3[][] {
  const out: THREE.Vector3[][] = [];
  const ring = ([z, half, top, bottom, power]: Row) => {
    const cy = (top + bottom) / 2;
    const shape = egg(half + grow, half + grow, (top - bottom) / 2 + grow, (top - bottom) / 2 + grow, power);
    return Array.from({ length: n }, (_, j) => {
      const [x, y] = shape((j / n) * Math.PI * 2);
      return new THREE.Vector3(x * s, (cy + y) * s, z * s);
    });
  };
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    const count = Math.max(1, Math.ceil((b[0] - a[0]) / step));
    for (let k = 0; k < count; k++) {
      const t = k / count;
      const u = t * t * (3 - 2 * t) * 0.35 + t * 0.65;
      out.push(ring(a.map((v, m) => v + (b[m]! - v) * u) as unknown as Row));
    }
  }
  out.push(ring(rows[rows.length - 1]!));
  return out;
}

/** The accent's line down the outside of the boot: high at the heel, low at the toe. */
const stripeY = (z: number) => -0.012 - 0.045 * Math.min(1, Math.max(0, (z + 0.04) / 0.17)) ** 1.3;

function contrast(hex: string): string {
  const c = new THREE.Color(hex);
  return c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.45 ? "#15171c" : "#f4f6f8";
}

/** One boot in the ankle's own frame. */
export function bootGeometry(c: BodyCtx): THREE.BufferGeometry {
  const s = c.d.s;
  const n = c.fine ? 30 : 14;
  const step = c.fine ? 0.012 : 0.03;
  const colour = new THREE.Color(c.look.boots);
  const accent = new THREE.Color(contrast(c.look.boots));
  const upper = loft(rings(UPPER, n, s, step), { start: new THREE.Vector3(0, -0.02 * s, -0.07 * s), end: new THREE.Vector3(0, -0.061 * s, 0.207 * s) });
  tint(upper, (p, out) => {
    const z = p.z / s;
    const y = p.y / s;
    const side = Math.abs(p.x / s) > 0.022;
    const onStripe = side && Math.abs(y - stripeY(z)) < 0.0075 && z > -0.05 && z < 0.15;
    out.copy(onStripe ? accent : colour);
    // The toe and heel caps are a shade darker; the upper catches the light along the top.
    if (z > 0.15 || z < -0.045) out.multiplyScalar(0.85);
    if (y < -0.064) out.multiplyScalar(0.7);
  });
  roughen(upper, 0.32);
  const sole = loft(rings(UPPER.map(([z, h]) => [z, h + 0.002, -0.068, -0.077, 3.4] as const), c.fine ? 20 : 8, s, step * 1.5), {
    start: new THREE.Vector3(0, -0.0725 * s, -0.069 * s),
    end: new THREE.Vector3(0, -0.0725 * s, 0.206 * s),
  });
  const parts = [upper, roughen(tint(sole, accent.clone().lerp(colour, 0.25)), 0.5)];
  // Studs: four under the forefoot, two under the heel.
  for (const [x, z] of [[0.024, 0.045], [-0.024, 0.045], [0.026, 0.125], [-0.026, 0.125], [0.02, -0.045], [-0.02, -0.045]] as const) {
    const stud = new THREE.CylinderGeometry(0.0045 * s, 0.0065 * s, 0.012 * s, c.fine ? 10 : 5);
    parts.push(roughen(tint(place(stud, [x * s, -0.082 * s, z * s]), "#c9ccd2"), 0.3));
  }
  if (c.fine) {
    // Laces across the instep.
    for (let i = 0; i < 5; i++) {
      const z = -0.005 + i * 0.022;
      const top = UPPER.reduce((y, r, k) => (r[0] <= z && (UPPER[k + 1]?.[0] ?? 1) > z ? r[2] : y), 0);
      const lace = new THREE.BoxGeometry(0.03 * s, 0.003 * s, 0.004 * s);
      parts.push(roughen(tint(place(lace, [0, (top + 0.002) * s, z * s], [-0.25, 0, 0]), accent), 0.7));
    }
  }
  // A knitted collar hugging the ankle, the sock vanishing into it.
  const collar = new THREE.CylinderGeometry(0.035 * s, 0.039 * s, 0.032 * s, n, 1, true);
  parts.push(roughen(tint(place(collar, [0, 0.004 * s, -0.008 * s], [0, 0, 0], [1, 1, 1.12]), colour.clone().multiplyScalar(0.5)), 0.85));
  // Raised so the soleplate rests on the turf when the ankle is at the leg solver's ground height, the studs sunk in.
  return join(parts).translate(0, 0.0115 * s, 0);
}

export function addBoots(gear: PartList, c: BodyCtx): void {
  gear.rigid(bootGeometry(c), "ankleL");
  gear.rigid(bootGeometry(c), "ankleR");
}
