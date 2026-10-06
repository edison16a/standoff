import * as THREE from "three";
import type { BodyCtx } from "./context";
import { egg, loft } from "./loft";
import { join, roughen, tint } from "./parts";
import { jointed, sweep } from "./sweep";

/**
 * Hands in the hand bone's frame, which sits in the palm a little below
 * the wrist: the palm faces in toward the body, the thumb forward (+z),
 * fingers relaxed and curled a little toward the palm. A keeper's hand
 * is a padded glove: fat fingers, a pale latex palm and a wrist strap.
 */

/** Across the knuckles, front to back: index, middle, ring and little finger, with their lengths and thickness. */
const FINGERS: readonly (readonly [z: number, length: number, radius: number])[] = [
  [0.027, 0.074, 0.0094],
  [0.009, 0.082, 0.0097],
  [-0.009, 0.077, 0.0091],
  [-0.026, 0.061, 0.0079],
];

/** The palm from the wrist down to the knuckles: [y, thickness to the back, to the palm side, half width]. */
const PALM: readonly (readonly [number, number, number, number])[] = [
  [0.068, 0.019, 0.019, 0.026],
  [0.045, 0.016, 0.019, 0.034],
  [0.01, 0.014, 0.018, 0.041],
  [-0.022, 0.012, 0.015, 0.042],
  [-0.032, 0.011, 0.012, 0.039],
];

export interface HandColours {
  /** The back of the hand and the fingers. */
  back: string;
  /** The palm side: the same as the back for skin, latex for a glove. */
  palm: string;
}

/** One hand: `side` 1 is the left, whose palm faces -x. `fat` swells it into a glove. */
export function handGeometry(c: BodyCtx, side: 1 | -1, colours: HandColours, fat = 1): THREE.BufferGeometry {
  const k = c.d.s * (0.96 + 0.08 * c.d.b) * (fat > 1 ? 1.12 : 1);
  const n = c.fine ? 14 : 6;
  const inward = -side;
  const rings = PALM.map(([y, back, palm, half]) => {
    // The palm's pads bulge toward the palm side; the knuckles are a ridge across the back.
    const shape = egg(side > 0 ? back * fat : palm * fat, side > 0 ? palm * fat : back * fat, half * fat, half * fat, 2.6);
    return Array.from({ length: c.fine ? 20 : 10 }, (_, j) => {
      const [x, z] = shape((j / (c.fine ? 20 : 10)) * Math.PI * 2);
      return new THREE.Vector3(x * k, y * k, z * k);
    });
  });
  const palm = loft(rings, { end: new THREE.Vector3(0, -0.036 * k, 0) });
  const parts = [palm];
  const curlAxis = new THREE.Vector3(0, 0, -side);
  // Glove fingers are stiffer: they barely curl.
  const curl = fat > 1 ? [0.12, 0.15, 0.1] : [0.28, 0.42, 0.3];
  for (const [z, length, radius] of FINGERS) {
    const start = new THREE.Vector3(0, -0.028 * k, z * k * fat);
    const pts = jointed(start, new THREE.Vector3(0, -1, 0), curlAxis, [length * 0.42 * k, length * 0.33 * k, length * 0.25 * k], curl, c.fine ? 3 : 1);
    const r = radius * k * fat;
    const radii = pts.map((_, i) => r * (1 - 0.22 * (i / (pts.length - 1))));
    parts.push(sweep(pts, radii, { n, capEnd: true, flat: 0.92 }));
  }
  // The thumb, from the heel of the hand forward and across toward the palm.
  const thumbStart = new THREE.Vector3(inward * 0.01 * k, 0.035 * k, 0.03 * k * fat);
  const thumbDir = new THREE.Vector3(inward * 0.35, -0.75, 0.55);
  const thumbAxis = new THREE.Vector3(0.6, 0, side * 0.5).normalize();
  const thumb = jointed(thumbStart, thumbDir, thumbAxis, [0.032 * k, 0.03 * k, 0.026 * k], [0, 0.25, 0.3], c.fine ? 3 : 1);
  parts.push(sweep(thumb, thumb.map((_, i) => 0.0115 * k * fat * (1 - 0.25 * (i / (thumb.length - 1)))), { n, capEnd: true }));
  const hand = join(parts);
  const back = new THREE.Color(colours.back);
  const palmColour = new THREE.Color(colours.palm);
  const nail = back.clone().lerp(new THREE.Color("#f3d6cf"), 0.45);
  tint(hand, (p, out) => {
    const palmSide = p.x * inward > 0.004 * k;
    out.copy(palmSide ? palmColour : back);
    // Pale nails on the backs of the fingertips of a bare hand.
    if (fat === 1 && !palmSide && p.y < -0.085 * k && p.x * inward < -0.004 * k) out.copy(nail);
  });
  if (fat > 1) {
    // The strap round the wrist.
    const strap = new THREE.CylinderGeometry(0.03 * k, 0.031 * k, 0.03 * k, c.fine ? 18 : 8);
    strap.scale(1, 1, 1.25);
    strap.translate(0, 0.064 * k, 0);
    return join([roughen(hand, (p) => (p.x * inward > 0.004 * k ? 0.75 : 0.55)), roughen(tint(strap, "#1b1d22"), 0.6)]);
  }
  return roughen(hand, 0.5);
}
