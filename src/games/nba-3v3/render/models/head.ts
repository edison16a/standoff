import * as THREE from "three";
import type { Look } from "../../roster";
import { ball, box, capsule, cyl, merge, paint } from "./geo";

/** A part of a sphere: `phi` sweeps around y from the front, `theta` down from the top. */
function shell(r: number, phi: [number, number], theta: [number, number]): THREE.BufferGeometry {
  const front = Math.PI / 2;
  return new THREE.SphereGeometry(r, 22, 12, front + phi[0], phi[1] - phi[0], theta[0], theta[1] - theta[0]);
}

/** Darkens or lightens a colour by a factor, for shade and highlight. */
export function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

function hair(look: Look, r: number): THREE.BufferGeometry[] {
  const c = look.hairColor;
  // The cap sits back a little, so the hairline shows a forehead.
  const cap = (grow: number, cover = 0.52) => paint(shell(r * grow, [-Math.PI, Math.PI], [0, Math.PI * cover]), c, { rot: [-0.32, 0, 0] });
  switch (look.hair) {
    case "bald":
      return [];
    case "buzz":
      return [cap(1.025)];
    case "short":
    case "waves":
      return [cap(1.05), paint(ball(r * 0.86, 16, 10), shade(c, look.hair === "waves" ? 1.25 : 1), { at: [0, r * 0.42, -r * 0.08], scale: [1.05, 0.55, 1.08] })];
    case "curly": {
      const parts = [cap(1.05)];
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4;
        const up = 0.25 + (i % 5) * 0.12;
        const tilt = Math.acos(Math.min(1, up));
        const x = Math.sin(tilt) * Math.cos(a) * r * 1.02;
        const z = Math.sin(tilt) * Math.sin(a) * r * 1.02 - r * 0.1;
        parts.push(paint(ball(r * 0.26, 8, 6), shade(c, 0.9 + (i % 3) * 0.12), { at: [x, Math.cos(tilt) * r * 1.02 + r * 0.05, z] }));
      }
      return parts;
    }
    case "swept":
      return [
        cap(1.07, 0.56),
        paint(ball(r * 0.9, 16, 10), c, { at: [r * 0.08, r * 0.5, r * 0.08], rot: [0.2, 0, -0.25], scale: [1.08, 0.5, 1.12] }),
        paint(ball(r * 0.45, 12, 8), shade(c, 1.15), { at: [r * 0.3, r * 0.62, r * 0.45], rot: [0.5, 0, -0.5], scale: [1.4, 0.5, 0.8] }),
      ];
    case "twists": {
      const parts = [cap(1.04)];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const lean = 0.35 + (i % 3) * 0.2;
        const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(a), Math.cos(lean), Math.sin(lean) * Math.sin(a) - 0.15).normalize();
        const at = dir.clone().multiplyScalar(r * 1.05);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const e = new THREE.Euler().setFromQuaternion(q);
        parts.push(paint(capsule(r * 0.1, r * 0.4, 3, 6), shade(c, 0.9 + (i % 2) * 0.2), { at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z] }));
      }
      return parts;
    }
  }
}

function beard(look: Look, r: number): THREE.BufferGeometry[] {
  const c = look.hairColor;
  switch (look.beard) {
    case "none":
      return [];
    case "stubble":
      return [paint(shell(r * 1.012, [-1.3, 1.3], [Math.PI * 0.56, Math.PI * 0.93]), shade(look.skin, 0.62))];
    case "short":
      return [
        paint(shell(r * 1.04, [-1.35, 1.35], [Math.PI * 0.56, Math.PI * 0.95]), c),
        paint(ball(r * 0.3, 10, 8), c, { at: [0, -r * 0.78, r * 0.62], scale: [1.2, 0.8, 0.9] }),
      ];
    case "full":
      return [
        paint(shell(r * 1.09, [-1.45, 1.45], [Math.PI * 0.52, Math.PI * 0.97]), c),
        paint(ball(r * 0.46, 12, 8), c, { at: [0, -r * 0.84, r * 0.58], scale: [1.25, 0.95, 0.95] }),
        paint(box(r * 0.62, r * 0.12, r * 0.14), c, { at: [0, -r * 0.3, r * 0.98] }),
      ];
    case "goatee":
      return [
        paint(ball(r * 0.3, 10, 8), c, { at: [0, -r * 0.8, r * 0.66], scale: [1, 1.1, 0.8] }),
        paint(box(r * 0.52, r * 0.1, r * 0.12), c, { at: [0, -r * 0.3, r * 0.97] }),
      ];
  }
}

/**
 * A head, sitting on the neck joint and facing +z: skull and jaw, ears,
 * nose, eyes, brows and mouth, then the hair, beard and headband that
 * make each player recognisable at a glance. One merged mesh.
 */
export function buildHead(look: Look, r: number): THREE.BufferGeometry {
  const skin = look.skin;
  const dark = shade(skin, 0.78);
  const cy = r * 1.05;
  const parts: THREE.BufferGeometry[] = [
    paint(ball(r, 24, 18), skin, { scale: [0.9, 1.06, 0.98] }),
    paint(ball(r * 0.8, 18, 12), skin, { at: [0, -r * 0.42, r * 0.16], scale: [0.95, 0.9, 1] }),
    paint(cyl(r * 0.5, r * 0.56, r * 0.9, 14), skin, { at: [0, -r * 1.05, -r * 0.08] }),
    paint(ball(r * 0.2, 10, 8), dark, { at: [0, -r * 0.02, r * 0.98], scale: [0.8, 1.1, 0.9] }),
    paint(box(r * 0.5, r * 0.07, r * 0.1), shade(skin, 0.45), { at: [0, -r * 0.46, r * 0.9] }),
  ];
  for (const side of [-1, 1]) {
    parts.push(paint(ball(r * 0.22, 10, 8), skin, { at: [side * r * 0.9, -r * 0.05, -r * 0.05], scale: [0.5, 1, 0.8] }));
    parts.push(paint(ball(r * 0.13, 10, 8), "#f4f1ea", { at: [side * r * 0.34, r * 0.18, r * 0.84], scale: [1.2, 0.8, 0.6] }));
    parts.push(paint(ball(r * 0.075, 8, 6), "#1a120c", { at: [side * r * 0.34, r * 0.18, r * 0.93] }));
    parts.push(paint(box(r * 0.34, r * 0.08, r * 0.1), look.hairColor, { at: [side * r * 0.35, r * 0.4, r * 0.86], rot: [0, 0, side * -0.12] }));
  }
  parts.push(...hair(look, r), ...beard(look, r));
  if (look.headband) parts.push(paint(cyl(r * 1.03, r * 1.02, r * 0.32, 24, true), look.headband, { at: [0, r * 0.52, -r * 0.02], rot: [-0.18, 0, 0] }));
  if (look.mouthguard) parts.push(paint(box(r * 0.3, r * 0.2, r * 0.08), "#f8fafc", { at: [r * 0.1, -r * 0.62, r * 0.9], rot: [0.2, 0, 0.15] }));
  const head = merge(parts);
  head.translate(0, cy, 0);
  return head;
}
