import * as THREE from "three";
import { along, angles, sample, tube, type Station } from "./loft";
import { ramp, weigh, type Weights } from "./parts";
import type { Dims } from "./rig";

/**
 * The jersey stretched over shoulder pads: a narrow waist tucked into
 * the belt, a chest and lats, then the pads flare out into a broad flat
 * shelf with a cap over each shoulder and close in round the collar.
 * Its texture coordinates are what the jersey print is painted for:
 * `u` starts under the right arm, so the chest is at a quarter round
 * and the back at three quarters, and `v` runs from the hem to the collar.
 */

/** Where the jersey print finds the chest and back along `u`. */
export const JERSEY_U = { front: 0.25, back: 0.75 } as const;
/** The torso fills the top of the jersey texture; the sleeves share the strip below. */
export const TORSO_V0 = 0.25;

/** The torso's sections, from the hem up to the collar. Heights and sizes in metres. */
export function torsoStations(d: Dims): Station[] {
  const H = d.height;
  const b = d.build;
  const W = 1 + 0.17 * b;
  const P = 1 + 0.09 * b;
  const D = 1 + 0.2 * b;
  // Linemen carry a gut in front.
  const gut = Math.max(0, b - 0.6) * 0.03;
  const neck = neckRadius(d);
  const st = (y: number, l: number, f: number, back: number, p = 2, z = 0) => ({ y: y * H, l: l * H, r: l * H, f: f * H, b: back * H, p, z: z * H });
  return along([
    st(0.582, 0.084 * W, 0.068 * D + gut, 0.064 * D, 2.1),
    st(0.63, 0.087 * W, 0.072 * D + gut * 1.2, 0.063 * D, 2.1),
    st(0.685, 0.093 * W, 0.08 * D + gut * 0.7, 0.068 * D, 2.2),
    st(0.73, 0.106 * W, 0.084 * D, 0.075 * D, 2.4),
    st(0.752, 0.13 * P, 0.088 * D, 0.08 * D, 2.6),
    st(0.782, 0.15 * P, 0.091 * D, 0.087 * D, 2.9),
    st(0.804, 0.155 * P, 0.089 * D, 0.086 * D, 3.3),
    st(0.82, 0.147 * P, 0.081 * D, 0.08 * D, 3.4),
    st(0.832, 0.126 * P, 0.071 * D, 0.072 * D, 3),
    st(0.841, 0.095, 0.06, 0.062, 2.4),
    st(0.846, 0.072, 0.054, 0.055, 2.1),
    { y: 0.849 * H, l: neck + 0.006 * H, r: neck + 0.006 * H, f: neck + 0.008 * H, b: neck + 0.004 * H, p: 2 },
  ]);
}

export const neckRadius = (d: Dims): number => (0.044 + 0.006 * d.build) * d.height;

/** The epaulets: a ridge round the outside of each pad cap, only out at the shoulders. */
function padCaps(d: Dims, keys: Station[]) {
  const edge = keys[6]!.t;
  const width = (keys[7]!.t - keys[5]!.t) * 0.35;
  return (t: number, a: number) => {
    const side = Math.abs(Math.sin(a));
    return 0.007 * d.height * Math.exp(-(((t - edge) / width) ** 2)) * side ** 8;
  };
}

/** The jersey torso, painted white so the print shows true, with a shade baked into the pad's overhang and under the arms. */
export function torso(d: Dims, detail: number): THREE.BufferGeometry {
  const keys = torsoStations(d);
  const last = keys[keys.length - 1]!.t;
  const overhang = keys[4]!.t;
  const geo = tube(new THREE.Vector3(0, 0, 0), 1, keys, {
    ring: angles(Math.round(56 * detail), [], -Math.PI / 2),
    step: 0.022 / detail,
    bump: padCaps(d, keys),
    // A V neck: the front of the collar dips, and the back of the pads rides up behind the helmet.
    lift: (t, a) => d.height * ramp(last - 0.06, last, t) * (-0.03 * Math.max(0, Math.cos(a)) ** 3 + 0.014 * Math.max(0, -Math.cos(a)) ** 2),
    paint: (t, a) => {
      const under = Math.exp(-(((t - overhang + 0.02) / 0.035) ** 2)) * 0.28;
      const pit = Math.abs(Math.sin(a)) ** 8 * ramp(overhang - 0.15, overhang, t) * 0.18;
      const g = 1 - under - pit;
      return { colour: new THREE.Color(g, g, g), rough: 0.72 };
    },
  });
  remapV(geo, TORSO_V0, 1);
  return weigh(geo, torsoWeights(d));
}

/** The torso bends at the waist; the outside of each pad lifts a little with its arm, as hinged epaulets do. */
export function torsoWeights(d: Dims) {
  const H = d.height;
  const padX = 0.15 * H;
  return (p: THREE.Vector3): Weights => {
    const spine = ramp(d.spineY + 0.005 * H, d.spineY + 0.09 * H, p.y);
    const lift = 0.3 * ramp(d.shoulderX * 0.85, padX, Math.abs(p.x)) * ramp(0.745 * H, 0.79 * H, p.y);
    const shoulder = p.x > 0 ? "shoulderL" : "shoulderR";
    return [["hips", 1 - spine], ["spine", spine * (1 - lift)], [shoulder, spine * lift]];
  };
}

/** Squeezes a part's `v` into a strip of a shared texture. */
export function remapV(geo: THREE.BufferGeometry, v0: number, v1: number, u0 = 0, u1 = 1): void {
  const uv = geo.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  uv.needsUpdate = true;
}

/** The torso's `v` at a height on the chest or back, for placing numbers and the name. */
export function torsoV(d: Dims, y: number): number {
  const keys = torsoStations(d);
  const t0 = keys[0]!.t;
  const t1 = keys[keys.length - 1]!.t;
  // The curve's height climbs steadily until the shelf, so a few halvings find the spot.
  let lo = t0;
  let hi = keys[7]!.t;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (sample(keys, mid).y < y) lo = mid;
    else hi = mid;
  }
  return TORSO_V0 + ((lo - t0) / (t1 - t0)) * (1 - TORSO_V0);
}
