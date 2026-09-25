import * as THREE from "three";
import type { Look } from "../../roster";
import { ball, blend, cone, cyl, paint, shade, type V3 } from "./geo";

/**
 * Every star's hair, built round a head of radius `R` centred on the
 * origin, face down +z. A cap hugs the skull; volumes, curls, twists and
 * tufts on top give each style its silhouette, which is what you
 * recognise first from the stands.
 */
export function hairParts(look: Look, R: number): THREE.BufferGeometry[] {
  const c = look.hair;
  const faded = blend(look.skin, c, 0.6);
  const cap = (colour: string, puff: number, cover: number, tilt = -0.35) => {
    const g = new THREE.SphereGeometry(R * puff, 24, 16, 0, Math.PI * 2, 0, Math.PI * (0.3 + 0.32 * cover));
    return paint(g, colour, { at: [0, R * 0.05, -R * 0.04], rot: [tilt, 0, 0], scale: [0.93, 1.06, 1.03] });
  };
  const volume = (at: V3, scale: V3, colour = c, rot: V3 = [0, 0, 0]) => paint(ball(R * 0.5, 18, 12), colour, { at: [at[0] * R, at[1] * R, at[2] * R], scale, rot });
  switch (look.hairStyle) {
    case "swept":
      // Short, a fringe brushed across to one side.
      return [cap(c, 1.07, 0.72), volume([0.12, 0.8, 0.45], [1.7, 0.5, 1.1], c, [0.25, 0, -0.25]), volume([0, 0.72, -0.2], [1.8, 0.7, 1.8])];
    case "slick":
      // Faded short at the sides, volume on top swept up and back.
      return [cap(faded, 1.03, 0.85), cap(c, 1.08, 0.5, -0.15), volume([0, 0.9, 0.1], [1.55, 0.62, 1.9], c, [-0.2, 0, 0]), volume([0, 0.95, 0.55], [1.2, 0.5, 0.8], shade(c, 0.08), [0.4, 0, 0])];
    case "buzz":
      return [cap(blend(look.skin, c, 0.78), 1.02, 0.84)];
    case "bun":
      // Long hair pulled back tight into a bun on the crown.
      return [cap(c, 1.07, 0.92, -0.5), volume([0, 0.72, -0.78], [0.8, 0.8, 0.8]), volume([0, 0.55, -0.62], [0.45, 0.45, 0.45], shade(c, -0.25)), volume([0, 0.25, -0.85], [1.5, 1.4, 0.7])];
    case "twists":
      return [cap(c, 1.06, 0.72), ...spikes(R, c, shade(c, 0.45), 24, 0.34, 1.15)];
    case "curls":
      return [cap(c, 1.07, 0.74), ...curls(R, c, 30, 1.03, 0.15)];
    case "parted":
      // A side parting, the hair swept over from it.
      return [cap(c, 1.08, 0.74), volume([0.18, 0.84, 0.25], [1.5, 0.55, 1.6], c, [0.15, 0, -0.3]), volume([-0.32, 0.72, 0.1], [0.9, 0.5, 1.6], shade(c, -0.08))];
    case "afro":
      return [cap(c, 1.12, 0.84), volume([0, 0.45, -0.1], [2.5, 2.1, 2.3]), ...curls(R, c, 60, 1.28, 0.24)];
    case "messy":
      return [cap(c, 1.08, 0.74), volume([0, 0.82, 0.1], [1.6, 0.6, 1.8]), ...spikes(R, c, shade(c, 0.18), 16, 0.22, 0.85, 0.5)];
    case "curlytop":
      // Short faded sides, a tight crop of curls on top.
      return [cap(faded, 1.03, 0.84), ...curls(R, c, 26, 1.05, 0.17, 0.5)];
  }
}

/** Small balls of hair spread evenly over the crown. `crown` limits how far down they go. */
function curls(R: number, colour: string, count: number, puff: number, size: number, crown = 0.9): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    // A golden angle spiral spreads them evenly without any randomness.
    const t = (i + 0.5) / count;
    const polar = Math.acos(1 - t * crown);
    const around = i * 2.39996;
    const at: V3 = [Math.sin(polar) * Math.cos(around) * R * puff * 0.93, Math.cos(polar) * R * puff * 1.03 + R * 0.08, Math.sin(polar) * Math.sin(around) * R * puff - R * 0.06];
    out.push(paint(ball(R * size, 8, 6), shade(colour, (i % 3) * 0.06 - 0.06), { at }));
  }
  return out;
}

/** Twists or tufts standing off the crown, their tips lighter. */
function spikes(R: number, colour: string, tip: string, count: number, length: number, spread: number, forward = 0): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const polar = Math.acos(1 - t * 0.75) * spread;
    const around = i * 2.39996;
    const dir = new THREE.Vector3(Math.sin(polar) * Math.cos(around), Math.cos(polar), Math.sin(polar) * Math.sin(around) + forward * 0.4).normalize();
    const base = dir.clone().multiplyScalar(R).add(new THREE.Vector3(0, R * 0.08, -R * 0.04));
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    const len = R * length;
    const mid = base.clone().addScaledVector(dir, len / 2);
    const end = base.clone().addScaledVector(dir, len);
    out.push(paint(cyl(R * 0.075, R * 0.095, len, 6), colour, { at: [mid.x, mid.y, mid.z], rot: [e.x, e.y, e.z] }));
    out.push(paint(cone(R * 0.08, R * 0.13, 6), tip, { at: [end.x, end.y, end.z], rot: [e.x, e.y, e.z] }));
  }
  return out;
}
