import * as THREE from "three";
import type { KitSpec } from "./kit";
import { along, angles, tube, type Station } from "./loft";
import { across, ramp, weigh, type Weights } from "./parts";
import type { Dims } from "./rig";

/**
 * The pants and legs. The pants are a tight shell from the belt over the
 * seat, and each leg is one smooth tube from inside the pants down to
 * the ankle: thigh pads and a knee pad under the pants, a stripe down
 * the outside, the hem just under the knee, then a sock over the calf
 * with the trim's bands round it.
 */

export const BELT = "#151515";

/** A colour darkened by a baked shade, 1 for none. */
const tint = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

/** The pants from the crotch up to the belt, which covers the jersey's hem. */
export function pelvis(d: Dims, kit: KitSpec, detail: number): THREE.BufferGeometry {
  const H = d.height;
  const W = 1 + 0.2 * d.build;
  const gut = Math.max(0, d.build - 0.6) * 0.03;
  const st = (y: number, l: number, f: number, b: number) => ({ y: y * H, l: l * H * W, r: l * H * W, f: f * H * W, b: b * H * W });
  // A small, high crotch: below the seat the thighs make the outline, not the pants' shell.
  const keys: Station[] = along([
    st(0.474, 0.034, 0.026, 0.032),
    st(0.49, 0.074, 0.05, 0.064),
    st(0.515, 0.1, 0.066, 0.085),
    st(0.552, 0.104, 0.074 + gut, 0.083),
    st(0.585, 0.093, 0.072 + gut * 1.1, 0.07),
    st(0.614, 0.091, 0.073 + gut, 0.068),
  ]);
  const beltFrom = keys[4]!.t - 0.004 * H;
  const geo = tube(new THREE.Vector3(), 1, keys, {
    ring: angles(Math.round(44 * detail)),
    step: 0.02 / detail,
    capStart: 0.01 * H,
    cuts: [beltFrom],
    paint: (t) => (t > beltFrom ? { colour: BELT, rough: 0.45 } : { colour: kit.pants, rough: 0.62 }),
  });
  return weigh(geo, pelvisWeights(d));
}

/** Low on the seat the pants stretch with each thigh, so a stride does not tear them. */
function pelvisWeights(d: Dims) {
  const H = d.height;
  return (p: THREE.Vector3): Weights => {
    const low = ramp(d.hipY + 0.01 * H, d.hipY - 0.05 * H, p.y) * ramp(0.01 * H, d.hipX, Math.abs(p.x)) * 0.75;
    const spine = 0.35 * ramp(d.spineY, d.spineY + 0.06 * H, p.y);
    return [["hips", 1 - low - spine], ["spine", spine], [p.x > 0 ? "hipL" : "hipR", low]];
  };
}

/** Out, in, front and back half sizes down the thigh then the shin, as shares of height. */
type Row = readonly [number, number, number, number, number];
const THIGH: readonly Row[] = [[-0.03, 0.052, 0.045, 0.05, 0.055], [0.03, 0.05, 0.046, 0.05, 0.052], [0.1, 0.045, 0.041, 0.046, 0.045], [0.18, 0.036, 0.033, 0.036, 0.034], [0.232, 0.03, 0.029, 0.031, 0.028]];
const SHIN: readonly Row[] = [[0.008, 0.029, 0.028, 0.031, 0.028], [0.05, 0.028, 0.028, 0.027, 0.034], [0.09, 0.029, 0.029, 0.026, 0.038], [0.15, 0.023, 0.022, 0.022, 0.026], [0.21, 0.019, 0.019, 0.02, 0.02], [0.243, 0.019, 0.019, 0.0195, 0.0195]];

export function leg(d: Dims, kit: KitSpec, side: 1 | -1, detail: number): THREE.BufferGeometry {
  const H = d.height;
  // Big thighs and calves, as the game's athletes have; heavier builds bigger still.
  const M = 1.07 * (1 + 0.24 * d.build);
  const make = (t: number, out: number, inn: number, f: number, b: number): Station => ({
    t: t * H, l: (side > 0 ? out : inn) * H * M, r: (side > 0 ? inn : out) * H * M, f: f * H * M, b: b * H * M,
  });
  const keys = [...THIGH.map((s) => make(...s)), ...SHIN.map(([t, o, i, f, b]) => make(t + d.thigh / H, o, i, f, b))];
  const hem = d.thigh + 0.035 * H;
  const bands = [hem + 0.06 * H, hem + 0.072 * H, hem + 0.082 * H, hem + 0.094 * H];
  const outer = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const stripe = 0.17;
  const geo = tube(new THREE.Vector3(side * d.hipX, d.hipY, 0), -1, keys, {
    ring: angles(Math.round(24 * detail), [outer - stripe, outer + stripe]),
    step: 0.03 / detail,
    capStart: 0.03 * H,
    cuts: [hem, ...bands],
    bump: (t, a) => {
      const front = Math.max(0, Math.cos(a)) ** 3;
      const knee = 0.009 * H * Math.exp(-(((t - d.thigh + 0.006 * H) / (0.03 * H)) ** 2));
      const pad = 0.004 * H * Math.exp(-(((t - 0.1 * H) / (0.05 * H)) ** 2));
      return (knee + pad) * front + (t > hem && t < hem + 0.01 * H ? 0.002 * H : 0);
    },
    paint: (t, a) => {
      // Baked shade: the crease behind the knee and the inside of the thigh up by the crotch.
      const behindKnee = Math.exp(-(((t - d.thigh) / (0.03 * H)) ** 2)) * Math.max(0, -Math.cos(a)) ** 2 * 0.3;
      const inner = Math.max(0, -Math.sin(a) * side) ** 2 * Math.max(0, 1 - t / (0.12 * H)) * 0.25;
      const shade = 1 - behindKnee - inner;
      if (t < hem) {
        const onStripe = Math.abs(Math.atan2(Math.sin(a - outer), Math.cos(a - outer))) < stripe;
        return { colour: tint(onStripe ? kit.stripe : kit.pants, shade), rough: 0.62 };
      }
      const band = (t > bands[0]! && t < bands[1]!) || (t > bands[2]! && t < bands[3]!);
      return { colour: tint(band ? kit.trim : kit.socks, shade), rough: 0.85 };
    },
  });
  return weigh(geo, legWeights(d, side));
}

function legWeights(d: Dims, side: 1 | -1) {
  const k = side > 0 ? "L" : "R";
  const bend = across(`hip${k}`, `knee${k}`, d.hipY - d.thigh, 0.03 * d.height);
  return (p: THREE.Vector3): Weights => {
    const top = 0.5 * ramp(d.hipY - 0.03 * d.height, d.hipY + 0.02 * d.height, p.y);
    const w = bend(p);
    return [["hips", top], [w[0]![0], w[0]![1] * (1 - top)], [w[1]![0], w[1]![1] * (1 - top)]];
  };
}
