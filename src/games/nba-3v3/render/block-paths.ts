import * as THREE from "three";
import type { BlockPreset } from "../engine/blocks/presets";

/**
 * The hand's path for each block preset, authored in the frame of the
 * strike: `f` flat from the shoulder toward the ball, `u` straight up,
 * `r` out to the striking hand's side. The windup is where the palm is
 * cocked, the bend is the pull of the curve it swings through, and the
 * contact end of the curve is the ball itself, so however the play is
 * warped to the real flight the palm arrives on the ball. Offsets are
 * metres from the contact point.
 */
export interface HandPath {
  /** Seconds from the windup to the touch. */
  strike: number;
  windup: readonly [f: number, u: number, r: number];
  bend: readonly [f: number, u: number, r: number];
  /** After the touch: how far on along the ball's way off, and how far down, the hand carries; how long it holds there; how long it plays. */
  through: number;
  drop: number;
  hold: number;
  show: number;
  /** How hard the hand accelerates into the ball: 1 even, higher is a whip that arrives fast. */
  whip: number;
}

export const HAND_PATHS: Record<BlockPreset, HandPath> = {
  // Both palms from behind the head, pushed straight through the ball and down.
  rejection: { strike: 0.18, windup: [-0.32, 0.12, 0.08], bend: [-0.18, 0.18, 0.05], through: 0.32, drop: 0.3, hold: 0, show: 0.34, whip: 1.6 },
  // High and wide, a big arc down and across through the ball.
  swat: { strike: 0.22, windup: [-0.2, 0.42, 0.42], bend: [-0.02, 0.38, 0.22], through: 0.6, drop: 0.6, hold: 0, show: 0.36, whip: 2 },
  // Up from behind the hip in one long sweep, then slapped down ahead.
  chase: { strike: 0.26, windup: [-0.6, -0.4, 0.18], bend: [-0.45, 0.15, 0.12], through: 0.4, drop: 0.42, hold: 0, show: 0.36, whip: 1.8 },
  // From his far side across to the ball, both hands, on through it.
  help: { strike: 0.2, windup: [-0.12, 0.18, 0.5], bend: [-0.06, 0.2, 0.3], through: 0.42, drop: 0.3, hold: 0, show: 0.34, whip: 1.6 },
  // Low and back, then the open palm flat into the ball and the glass, held there a beat.
  pin: { strike: 0.2, windup: [-0.42, -0.12, 0.1], bend: [-0.28, 0.06, 0.04], through: 0.04, drop: 0.04, hold: 0.12, show: 0.42, whip: 1.4 },
  // Straight up to the end of the reach for the graze, then a flick.
  tip: { strike: 0.16, windup: [-0.14, -0.34, 0.06], bend: [-0.06, -0.12, 0.03], through: 0.1, drop: -0.08, hold: 0, show: 0.26, whip: 1.3 },
  // The same full reach; the ball is never there, and the hand falls away.
  miss: { strike: 0.18, windup: [-0.14, -0.34, 0.06], bend: [-0.06, -0.12, 0.03], through: 0.05, drop: 0.7, hold: 0, show: 0.2, whip: 1.3 },
  // Up out of the run, the arm long and straight up and out in front of him.
  closeout: { strike: 0.2, windup: [-0.25, -0.45, 0.1], bend: [-0.12, -0.15, 0.05], through: 0.25, drop: 0.2, hold: 0, show: 0.32, whip: 1.5 },
};

const f = new THREE.Vector3();
const r = new THREE.Vector3();
const w = new THREE.Vector3();
const b = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** The strike's frame from the shoulder to the ball: `f` and `r` flat, `r` to the striking side. */
export function strikeFrame(shoulder: THREE.Vector3, ball: THREE.Vector3, side: 1 | -1, fOut: THREE.Vector3, rOut: THREE.Vector3): void {
  fOut.set(ball.x - shoulder.x, 0, ball.z - shoulder.z);
  if (fOut.lengthSq() < 1e-6) fOut.set(0, 0, 1);
  fOut.normalize();
  // Right of the way he looks is f x up; the left hand's side is the other way.
  rOut.crossVectors(fOut, UP).multiplyScalar(side);
}

/**
 * Where the palm is on the way in: `k` 0 at the windup to 1 on the ball,
 * along the curve from the windup through the bend to the contact. The
 * curve is warped to wherever the ball really is, so its end is exact.
 */
export function pathPoint(p: HandPath, shoulder: THREE.Vector3, contact: THREE.Vector3, side: 1 | -1, k: number, out: THREE.Vector3): THREE.Vector3 {
  strikeFrame(shoulder, contact, side, f, r);
  w.copy(contact).addScaledVector(f, p.windup[0]).addScaledVector(UP, p.windup[1]).addScaledVector(r, p.windup[2]);
  b.copy(contact).addScaledVector(f, p.bend[0]).addScaledVector(UP, p.bend[1]).addScaledVector(r, p.bend[2]);
  // Accelerating into the ball: slow off the windup, fastest at the touch.
  const e = Math.pow(Math.min(1, Math.max(0, k)), p.whip);
  const a = (1 - e) * (1 - e);
  const c = 2 * (1 - e) * e;
  const d = e * e;
  return out.set(w.x * a + b.x * c + contact.x * d, w.y * a + b.y * c + contact.y * d, w.z * a + b.z * c + contact.z * d);
}
