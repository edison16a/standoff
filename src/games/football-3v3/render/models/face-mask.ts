import * as THREE from "three";
import type { Look } from "../../builds";
import { dress, merge } from "./parts";

/**
 * The face mask and chin strap, in the head's frame like the shell.
 * Bars are tubes bent round the face from clips on the jaw flaps: open
 * masks have a top bar over the eyes, two below and one upright at the
 * chin; cages add a bar and uprights in front of the mouth. A tinted
 * visor is a curved shield inside the mask, across the eyes.
 */

type P = readonly [number, number, number];

/** A bar from one jaw flap round the front to the other: its height and depth at the sides and the front. */
interface Bar {
  side: P;
  front: readonly [number, number];
}

const OPEN: readonly Bar[] = [
  { side: [0.104, 0.028, 0.064], front: [0.04, 0.162] },
  { side: [0.1, -0.018, 0.066], front: [-0.027, 0.186] },
  { side: [0.088, -0.062, 0.064], front: [-0.094, 0.172] },
];
const CAGE: readonly Bar[] = [...OPEN, { side: [0.095, -0.04, 0.066], front: [-0.06, 0.184] }];

function barCurve(b: Bar): THREE.CatmullRomCurve3 {
  const [xs, ys, zs] = b.side;
  const [yf, zf] = b.front;
  const half: P[] = [
    [xs, ys, zs],
    [xs * 0.93, ys + (yf - ys) * 0.3, zs + (zf - zs) * 0.5],
    [xs * 0.62, ys + (yf - ys) * 0.78, zf - 0.013],
    [0, yf, zf],
  ];
  const all = [...half.map(([x, y, z]) => new THREE.Vector3(-x, y, z)), ...half.slice(0, -1).reverse().map(([x, y, z]) => new THREE.Vector3(x, y, z))];
  return new THREE.CatmullRomCurve3(all, false, "centripetal");
}

const line = (pts: P[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");

export interface MaskOptions {
  colour: string;
  /** Segments along each bar. */
  detail: number;
}

export function faceMask(look: Look, o: MaskOptions): THREE.BufferGeometry {
  const cage = look.mask === "cage";
  const r = 0.0056;
  const seg = Math.round(26 * o.detail);
  const paint = { colour: o.colour, rough: 0.42 };
  const bar = (c: THREE.Curve<THREE.Vector3>, n = seg) => dress(new THREE.TubeGeometry(c, n, r, 7, false), paint);
  const parts = (cage ? CAGE : OPEN).map((b) => bar(barCurve(b)));
  for (const s of [-1, 1]) {
    // The side frame down each jaw flap, and the rubber clips holding the mask on.
    parts.push(bar(line([[s * 0.104, 0.028, 0.064], [s * 0.104, -0.018, 0.07], [s * 0.088, -0.062, 0.066]]), 10));
    for (const [x, y, z] of [[0.104, 0.028, 0.064], [0.088, -0.062, 0.064]] as const) {
      parts.push(dress(new THREE.BoxGeometry(0.012, 0.022, 0.016), { colour: "#1b1b1b", rough: 0.7 }, { at: [s * x, y, z - 0.006] }));
    }
    parts.push(dress(new THREE.BoxGeometry(0.02, 0.012, 0.012), { colour: "#1b1b1b", rough: 0.7 }, { at: [s * 0.045, 0.047, 0.152], rot: [0.5, 0, 0] }));
  }
  // An upright from the lower bars down the middle, and on a cage two more either side.
  parts.push(bar(line([[0, cage ? 0.04 : -0.027, cage ? 0.162 : 0.186], [0, -0.06, 0.184], [0, -0.094, 0.172]]), 12));
  if (cage) for (const s of [-1, 1]) parts.push(bar(line([[s * 0.042, 0.037, 0.155], [s * 0.05, -0.027, 0.174], [s * 0.048, -0.091, 0.162]]), 12));
  parts.push(...chinStrap());
  return merge(parts);
}

/** A white cup under the chin, held by straps to snaps on the jaw flaps. */
function chinStrap(): THREE.BufferGeometry[] {
  const strap = { colour: "#202020", rough: 0.7 };
  const out = [dress(new THREE.SphereGeometry(0.024, 12, 8), { colour: "#e9e9e6", rough: 0.4 }, { at: [0, -0.108, 0.066], scale: [1.3, 0.6, 1], rot: [-0.5, 0, 0] })];
  for (const s of [-1, 1]) {
    for (const [from, to] of [[[0.026, -0.11, 0.056], [0.095, -0.08, 0.005]], [[0.028, -0.1, 0.075], [0.103, -0.035, 0.05]]] as const) {
      const a = new THREE.Vector3(s * from[0], from[1], from[2]);
      const b = new THREE.Vector3(s * to[0], to[1], to[2]);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const g = dress(new THREE.BoxGeometry(0.004, a.distanceTo(b), 0.013), strap);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      g.translate(mid.x, mid.y, mid.z);
      out.push(g);
      out.push(dress(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 10), { colour: "#d8d8d8", rough: 0.3 }, { at: [s * (to[0] + 0.012), to[1], to[2]], rot: [0, 0, Math.PI / 2] }));
    }
  }
  return out;
}

/** The visor: a band of a cylinder round the eyes, just inside the mask's top bar. */
export function visorGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.126, 0.126, 0.062, 28, 1, true, -0.78, 1.56);
  g.rotateX(-0.1);
  g.translate(0, 0.019, 0.004);
  return g;
}
