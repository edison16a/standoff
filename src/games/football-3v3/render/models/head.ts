import * as THREE from "three";
import { blend, shade } from "./geo";
import type { KitSpec } from "./kit";
import { angles, tube, type Station } from "./loft";
import { dress, merge, ramp, rigid, weigh, type Weights } from "./parts";
import type { Dims } from "./rig";
import { neckRadius } from "./torso";

/**
 * The neck and the face inside the helmet. Only the face shows, framed
 * by the shell and behind the mask, so it is shaped for that view: a
 * brow over shaded sockets, eyes that catch the light, a nose, lips, a
 * jaw that fills the chin strap, and eye black under the eyes on the
 * builds that wear it. Locks fall from under the back of the shell.
 */

/** The head from the chin up, in metres about its middle: the face is fuller in front, the jaw narrows to the chin. */
const SKULL: readonly Station[] = [
  { t: -0.112, l: 0.024, r: 0.024, f: 0.02, b: 0.02, z: 0.05 },
  { t: -0.1, l: 0.046, r: 0.046, f: 0.034, b: 0.03, z: 0.04 },
  { t: -0.078, l: 0.061, r: 0.061, f: 0.058, b: 0.05, z: 0.026 },
  { t: -0.048, l: 0.068, r: 0.068, f: 0.077, b: 0.07, z: 0.01 },
  { t: -0.014, l: 0.072, r: 0.072, f: 0.084, b: 0.086, z: 0.004 },
  { t: 0.022, l: 0.074, r: 0.074, f: 0.088, b: 0.095 },
  { t: 0.062, l: 0.071, r: 0.071, f: 0.08, b: 0.097, z: -0.004 },
  { t: 0.098, l: 0.058, r: 0.058, f: 0.06, b: 0.08, z: -0.01 },
];

/** The middle of the head, in the model at rest. */
export const headCentre = (d: Dims) => new THREE.Vector3(0, d.neckY + d.head, 0);

export function neck(d: Dims, kit: KitSpec, detail: number): THREE.BufferGeometry {
  const H = d.height;
  const r = neckRadius(d);
  const geo = tube(new THREE.Vector3(0, d.neckY - 0.035 * H, 0.004 * H), 1, [
    { t: 0, l: r * 1.3, r: r * 1.3, f: r * 1.05, b: r * 1.15 },
    { t: 0.06 * H, l: r, r, f: r * 0.92, b: r },
    { t: 0.1 * H, l: r * 0.92, r: r * 0.92, f: r * 0.86, b: r * 0.9 },
  ], { ring: angles(Math.round(18 * detail)), step: 0.025 / detail, paint: () => ({ colour: kit.look.skin, rough: 0.5 }) });
  return weigh(geo, (p): Weights => {
    const w = ramp(d.neckY - 0.01 * H, d.neckY + 0.04 * H, p.y);
    return [["spine", 1 - w], ["neck", w]];
  });
}

/**
 * The helmet's brim and padding keep the top of the face in shadow, and
 * the floodlights' shadow maps are far too coarse to show it, so it is
 * baked in: darker from the cheekbones up, darkest at the brow.
 */
function shadeUnderBrim(g: THREE.BufferGeometry): void {
  const pos = g.getAttribute("position");
  const col = g.getAttribute("color");
  for (let i = 0; i < pos.count; i++) {
    const k = 1 - 0.3 * ramp(-0.09, 0.07, pos.getY(i)) - 0.15 * ramp(0.06, -0.02, pos.getZ(i));
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  col.needsUpdate = true;
}

export function face(d: Dims, kit: KitSpec, detail: number): THREE.BufferGeometry {
  const skin = kit.look.skin;
  const deep = shade(skin, -0.42);
  const lip = blend(skin, "#5a2620", 0.35);
  // The face is small and mostly inside the shell, so its pieces stay light.
  const seg = Math.max(6, Math.round(12 * detail));
  const fine = Math.max(5, Math.round(8 * detail));
  const ball = (r: number) => new THREE.SphereGeometry(r, fine, Math.max(3, fine - 2));
  const S = { colour: skin, rough: 0.48 };
  const parts: THREE.BufferGeometry[] = [
    // One smooth head from the chin to the crown: jaw, cheekbones, temples and forehead.
    tube(new THREE.Vector3(), 1, SKULL, { ring: angles(seg * 2), step: 0.02 / Math.max(0.5, detail), capStart: 0.012, capEnd: 0.03, paint: () => S }),
    // The brow ridge shades the eyes from the lights above.
    dress(ball(0.03), S, { at: [0, 0.026, 0.08], scale: [2.0, 0.42, 0.62] }),
    // The nose: a bridge and a rounded tip with nostrils' shadow under it.
    dress(new THREE.CylinderGeometry(0.007, 0.012, 0.04, fine), S, { at: [0, 0.002, 0.094], rot: [-0.32, 0, 0] }),
    dress(ball(0.013), S, { at: [0, -0.02, 0.1], scale: [1.15, 0.85, 0.95] }),
    dress(ball(0.008), { colour: deep, rough: 0.7 }, { at: [0, -0.027, 0.096], scale: [1.8, 0.5, 0.8] }),
    // Lips.
    dress(ball(0.012), { colour: lip, rough: 0.35 }, { at: [0, -0.049, 0.088], scale: [1.9, 0.42, 0.6] }),
    dress(ball(0.012), { colour: shade(lip, -0.15), rough: 0.35 }, { at: [0, -0.058, 0.086], scale: [1.6, 0.45, 0.6] }),
  ];
  for (const x of [-0.031, 0.031]) {
    // The socket's shade, the white of the eye, and the dark iris catching a highlight.
    parts.push(dress(ball(0.017), { colour: deep, rough: 0.6 }, { at: [x, 0.006, 0.08], scale: [1.15, 0.75, 0.55] }));
    parts.push(dress(ball(0.011), { colour: "#d9cfc2", rough: 0.12 }, { at: [x, 0.005, 0.084], scale: [1.2, 0.55, 0.62] }));
    parts.push(dress(ball(0.0048), { colour: "#1c120c", rough: 0.08 }, { at: [x * 0.97, 0.005, 0.0898], scale: [1, 1, 0.5] }));
    if (kit.eyeBlack) parts.push(dress(ball(0.016), { colour: "#070707", rough: 0.9 }, { at: [x * 1.04, -0.016, 0.082], scale: [1.05, 0.38, 0.5] }));
  }
  if (kit.locks) {
    // Locks fall from under the back of the shell onto the pads.
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.022;
      const len = 0.1 + ((i * 7) % 3) * 0.025;
      parts.push(dress(new THREE.CapsuleGeometry(0.011, len, 2, 5), { colour: kit.locks, rough: 0.75 }, { at: [x, -0.12 - len / 2, -0.1 + Math.abs(x) * 0.35], rot: [-0.25, 0, x * 1.4] }));
    }
  }
  const head = merge(parts);
  shadeUnderBrim(head);
  // Set back in the shell's opening, as a face sits behind the brim and the bars.
  head.translate(0, 0, -0.008);
  head.scale(d.headScale, d.headScale, d.headScale);
  const c = headCentre(d);
  head.translate(c.x, c.y, c.z);
  return weigh(head, rigid("neck"));
}
