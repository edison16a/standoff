import * as THREE from "three";
import { box, lathe, merge, paint, torus } from "./geo";

/** Half the ball's length and its widest radius, in metres. */
export const BALL_HALF = 0.142;
export const BALL_RADIUS = 0.086;

/** The ball's outline along its long axis: fat in the middle, drawn to blunt points. */
export function profile(steps = 16): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const y = -BALL_HALF + (2 * BALL_HALF * i) / steps;
    const u = 1 - (y / BALL_HALF) ** 2;
    out.push([Math.max(0.004, BALL_RADIUS * Math.pow(Math.max(0, u), 0.72)), y]);
  }
  return out;
}

/**
 * The football: brown leather with white stripes round both ends and a
 * row of white laces on one side. The long axis is local y and the laces
 * face local +z, so turning the ball about y shows the spiral spinning.
 */
export function footballGeometry(): THREE.BufferGeometry {
  const leather = "#7a3f1d";
  const radiusAt = (y: number) => BALL_RADIUS * Math.pow(Math.max(0, 1 - (y / BALL_HALF) ** 2), 0.72);
  const parts: THREE.BufferGeometry[] = [paint(lathe(profile(), 24), leather)];
  for (const y of [-0.098, 0.098]) {
    const r = radiusAt(y);
    parts.push(paint(torus(r + 0.001, 0.006, 24, 4), "#f4f1e8", { at: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
  }
  // The seam the laces run along, then the laces across it.
  parts.push(paint(box(0.008, 0.16, 0.006), "#ede7d6", { at: [0, 0, BALL_RADIUS + 0.001] }));
  for (let i = -3; i <= 3; i++) parts.push(paint(box(0.032, 0.007, 0.008), "#f7f4ec", { at: [0, i * 0.018, BALL_RADIUS + 0.002] }));
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
    const r = BALL_RADIUS + 0.003;
    parts.push(paint(box(0.006, 0.16, 0.004), "#ffffff", { at: [Math.sin(a) * r, 0, Math.cos(a) * r], rot: [0, a, 0] }));
    for (let i = -3; i <= 3; i += 2) parts.push(paint(box(0.03, 0.006, 0.004), "#ffffff", { at: [Math.sin(a) * r, i * 0.018, Math.cos(a) * r], rot: [0, a, 0] }));
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
