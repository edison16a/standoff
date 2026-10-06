import * as THREE from "three";
import type { KitSpec } from "./kit";
import { angles, sample, tube, type Station } from "./loft";
import { across, ramp, weigh, type Weights } from "./parts";
import type { Dims } from "./rig";
import { remapV } from "./torso";

/**
 * Arms: one smooth tube from under the shoulder pad to the wrist, with a
 * deltoid, biceps and triceps, a bony elbow and a forearm that tapers
 * to the wrist. A long sleeve paints it in the build's accent and white
 * tape wraps the wrist. Over the top the jersey's sleeve stretches
 * round the pad cap and stops above the biceps, cut off on the bare
 * armed builds.
 */

/** Out, in, front and back half sizes per station, as shares of height. */
const UPPER: readonly (readonly [number, number, number, number, number])[] = [
  [-0.02, 0.033, 0.029, 0.033, 0.033],
  [0.02, 0.036, 0.03, 0.034, 0.034],
  [0.06, 0.033, 0.029, 0.031, 0.033],
  [0.1, 0.029, 0.027, 0.031, 0.029],
  [0.145, 0.025, 0.024, 0.025, 0.025],
];
const FORE: readonly (readonly [number, number, number, number, number])[] = [
  [0, 0.022, 0.022, 0.022, 0.025],
  [0.03, 0.026, 0.024, 0.025, 0.024],
  [0.06, 0.024, 0.022, 0.022, 0.022],
  [0.11, 0.016, 0.015, 0.018, 0.018],
  [0.148, 0.012, 0.0115, 0.016, 0.016],
];

function stations(d: Dims, side: 1 | -1, grow = 0): Station[] {
  const H = d.height;
  // Football players carry big arms; heavier builds bigger still.
  const M = 1.12 * (1 + 0.2 * d.build);
  const make = (t: number, out: number, inn: number, f: number, b: number): Station => {
    const [o, i] = [out * H * M + grow, inn * H * M + grow];
    return { t: t * H, l: side > 0 ? o : i, r: side > 0 ? i : o, f: f * H * M + grow, b: b * H * M + grow };
  };
  return [...UPPER.map((s) => make(...s)), ...FORE.map(([t, ...r]) => make(t + d.upper / H, ...r))];
}

/** The arm's weights: the elbow blends the two bones and the top of the deltoid stays a little with the chest. */
function armWeights(d: Dims, side: 1 | -1, chest: number) {
  const k = side > 0 ? "L" : "R";
  const bend = across(`shoulder${k}`, `elbow${k}`, d.shoulderY - d.upper, 0.024 * d.height);
  return (p: THREE.Vector3): Weights => {
    const top = chest * ramp(d.shoulderY - 0.02 * d.height, d.shoulderY + 0.03 * d.height, p.y);
    const w = bend(p);
    return [["spine", top], [w[0]![0], w[0]![1] * (1 - top)], [w[1]![0], w[1]![1] * (1 - top)]];
  };
}

export function arm(d: Dims, kit: KitSpec, side: 1 | -1, detail: number): THREE.BufferGeometry {
  const H = d.height;
  const keys = stations(d, side);
  const wrist = d.upper + 0.148 * H;
  const long = kit.sleeves === "long";
  const geo = tube(new THREE.Vector3(side * d.shoulderX, d.shoulderY, 0), -1, keys, {
    ring: angles(Math.round(22 * detail)),
    step: 0.02 / detail,
    capStart: 0.03 * H,
    cuts: [wrist - 0.032 * H, wrist - 0.006 * H],
    // The point of the elbow sticks out at the back.
    bump: (t, a) => 0.006 * H * Math.exp(-(((t - d.upper) / (0.015 * H)) ** 2)) * Math.max(0, -Math.cos(a)) ** 4,
    paint: (t) => {
      if (t > wrist - 0.032 * H && t < wrist - 0.006 * H) return { colour: "#f1f1ee", rough: 0.9 };
      return long ? { colour: kit.look.accent, rough: 0.78 } : { colour: kit.look.skin, rough: 0.5 };
    },
  });
  return weigh(geo, armWeights(d, side, 0.45));
}

/** How far the jersey sleeve runs down the arm. */
const sleeveEnd = (kit: KitSpec, H: number) => (kit.sleeves === "bare" ? 0.036 : 0.074) * H;

/** The jersey's sleeve over the pad cap, printed from the bottom strip of the jersey texture. */
export function sleeve(d: Dims, kit: KitSpec, side: 1 | -1, detail: number): THREE.BufferGeometry {
  const H = d.height;
  const end = sleeveEnd(kit, H);
  const keys = stations(d, side, 0.006 * H).filter((s) => s.t < end + 0.03 * H);
  // The sleeve billows round the pad cap at the top and hugs the arm at the hem.
  keys[0] = { ...keys[0]!, l: keys[0]!.l + 0.012 * H, r: keys[0]!.r + 0.008 * H, f: keys[0]!.f + 0.01 * H, b: keys[0]!.b + 0.01 * H };
  const cut: Station[] = keys.filter((s) => s.t < end);
  cut.push({ ...sample(keys, end), y: undefined });
  const outer = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const geo = tube(new THREE.Vector3(side * d.shoulderX, d.shoulderY, 0), -1, cut, {
    ring: angles(Math.round(24 * detail), [], outer - Math.PI),
    step: 0.016 / detail,
    capStart: 0.036 * H,
    paint: (t) => ({ colour: t > end - 0.008 * H ? "#d8d8d8" : "#ffffff", rough: 0.72 }),
  });
  // The texture's bottom strip: the left sleeve on its left half, the right on its right, cuff at the bottom.
  const u0 = side > 0 ? 0 : 0.5;
  remapV(geo, 0.24, 0.005, u0, u0 + 0.5);
  return weigh(geo, armWeights(d, side, 0.7));
}
