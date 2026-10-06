import * as THREE from "three";
import { box, lathe, merge, paint, torus } from "./geo";

/** Half the ball's length and its widest radius, in metres. */
export const BALL_HALF = 0.142;
export const BALL_RADIUS = 0.086;

/** The ball's radius a distance `y` along its long axis from the middle. */
export function radiusAt(y: number): number {
  return BALL_RADIUS * Math.pow(Math.max(0, 1 - (y / BALL_HALF) ** 2), 0.72);
}

/** The ball's outline along its long axis: fat in the middle, drawn to closed points. */
export function profile(steps = 16): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const y = -BALL_HALF + (2 * BALL_HALF * i) / steps;
    // The tips close to a point so no hole shows the turf through the nose.
    out.push([i === 0 || i === steps ? 0 : radiusAt(y), y]);
  }
  return out;
}

/** How steeply the surface falls away at `y`, as the tilt that lays a part flat on it. */
function slopeAt(y: number): number {
  const h = 0.002;
  return Math.atan((radiusAt(y + h) - radiusAt(y - h)) / (2 * h));
}

/**
 * The seam and laces on the +z side, each piece set down on the curved
 * leather so none of them float off the ball near the ends, which a
 * close camera riding the spiral would show.
 */
function laceStrip(seam: string, lace: string, lift: number, width = 0.008): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const pieces = 8;
  const half = 0.075;
  const len = (2 * half) / pieces;
  for (let i = 0; i < pieces; i++) {
    const y = -half + len * (i + 0.5);
    parts.push(paint(box(width, len * 1.04, 0.005), seam, { at: [0, y, radiusAt(y) + lift], rot: [slopeAt(y), 0, 0] }));
  }
  for (let i = -3; i <= 3; i++) {
    const y = i * 0.018;
    parts.push(paint(box(0.03, 0.007, 0.006), lace, { at: [0, y, radiusAt(y) + lift + 0.001], rot: [slopeAt(y), 0, 0] }));
  }
  return parts;
}

/**
 * The football: brown leather with white stripes round both ends and a
 * row of white laces on one side. The long axis is local y and the laces
 * face local +z, so turning the ball about y shows the spiral spinning.
 */
export function footballGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [paint(lathe(profile(), 24), "#7a3f1d")];
  for (const y of [-0.098, 0.098]) {
    parts.push(paint(torus(radiusAt(y) + 0.001, 0.006, 24, 4), "#f4f1e8", { at: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
  }
  parts.push(...laceStrip("#ede7d6", "#f7f4ec", 0.0005));
  return merge(parts);
}

/**
 * The laces smeared round the ball: copies spread about the long axis,
 * drawn faint over a fast spiral so the spin reads as a blur the way a
 * camera sees it, instead of laces jumping about from frame to frame.
 */
export function laceBlurGeometry(copies = 10): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < copies; k++) {
    const a = (k / copies) * Math.PI * 2;
    for (const g of laceStrip("#ffffff", "#ffffff", 0.0015, 0.006)) parts.push(g.rotateY(a));
  }
  return merge(parts);
}

const UP = new THREE.Vector3(0, 1, 0);
const q = new THREE.Quaternion();
const spin = new THREE.Quaternion();

/**
 * Turns the ball so its long axis lies along `axis` and it has rolled
 * `roll` radians about that axis. Pure maths on a quaternion, so it can
 * be tested without drawing.
 */
export function orientBall(out: THREE.Quaternion, axis: THREE.Vector3, roll: number): THREE.Quaternion {
  const a = axis.lengthSq() > 1e-9 ? axis.clone().normalize() : UP;
  q.setFromUnitVectors(UP, a);
  spin.setFromAxisAngle(UP, roll);
  return out.copy(q).multiply(spin);
}
