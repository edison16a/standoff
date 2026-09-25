import * as THREE from "three";
import type { Look } from "../../roster";
import { ball, blend, merge, paint, shade, type V3 } from "./geo";
import { hairParts } from "./hair";

/** Head size in metres for a 1.8 metre player; everything scales with height. */
export const R = 0.108;

const oval = (r: number, at: V3, scale: V3, colour: string, rot: V3 = [0, 0, 0]) => paint(ball(r, 18, 14), colour, { at, scale, rot });

/**
 * A stylised head: skull, cheeks and jaw, chin, ears, nose, eyes with
 * whites and irises, brows and lips, then the player's hair and beard.
 * The origin is the middle of the head and the face looks down +z.
 * Hair and skin carry most of the likeness at television distance, so
 * they get the most care; the face reads in the close ups.
 */
export function headGeometry(look: Look): THREE.BufferGeometry {
  const skin = look.skin;
  const cheek = shade(skin, -0.04);
  const lip = blend(shade(skin, -0.25), "#8a3a34", 0.35);
  const parts: THREE.BufferGeometry[] = [
    oval(R, [0, 0.03 * R, -0.03 * R], [0.9, 1.04, 1], skin),
    oval(R * 0.84, [0, -0.3 * R, 0.16 * R], [0.9, 0.95, 0.92], cheek),
    oval(R * 0.34, [0, -0.78 * R, 0.56 * R], [1.15, 0.8, 0.9], skin),
    // Nose: a bridge and a rounded tip.
    oval(R * 0.16, [0, -0.08 * R, 0.96 * R], [0.75, 1.9, 0.9], skin, [0.25, 0, 0]),
    oval(R * 0.15, [0, -0.3 * R, 1.02 * R], [1.2, 0.9, 1], shade(skin, -0.02)),
    oval(R * 0.2, [0, -0.54 * R, 0.86 * R], [1.2, 0.3, 0.55], lip),
  ];
  for (const side of [-1, 1]) {
    const x = side * 0.35 * R;
    parts.push(oval(R * 0.24, [side * 0.9 * R, -0.05 * R, -0.04 * R], [0.42, 1, 0.75], skin));
    parts.push(oval(R * 0.16, [x, 0.08 * R, 0.86 * R], [1.2, 0.72, 0.55], "#f7f4ef"));
    parts.push(oval(R * 0.09, [x, 0.08 * R, 0.93 * R], [1, 1, 0.6], "#2a1b12"));
    parts.push(oval(R * 0.03, [x + 0.03 * R, 0.12 * R, 0.98 * R], [1, 1, 1], "#ffffff"));
    // Brows, tipped slightly down toward the nose.
    parts.push(oval(R * 0.2, [x, 0.3 * R, 0.86 * R], [1.2, 0.3, 0.45], shade(look.hair, 0.05), [0, 0, side * -0.18]));
    // A soft shadow in the eye socket gives the face some depth.
    parts.push(oval(R * 0.22, [x, 0.12 * R, 0.8 * R], [1.1, 0.8, 0.5], shade(skin, -0.12)));
  }
  parts.push(...beard(look), ...hairParts(look, R));
  return merge(parts);
}

function beard(look: Look): THREE.BufferGeometry[] {
  if (look.beard === "none") return [];
  const colour = look.beard === "full" ? look.hair : blend(look.skin, look.hair, 0.45);
  const lift = look.beard === "full" ? 1.07 : 1.015;
  // A shell over the jaw and chin, open where the mouth is.
  const jaw = new THREE.SphereGeometry(R * 0.86 * lift, 20, 10, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.46);
  const parts = [paint(jaw, colour, { at: [0, -0.3 * R, 0.16 * R], scale: [0.92, 0.98, 0.94] })];
  parts.push(oval(R * 0.35 * lift, [0, -0.8 * R, 0.56 * R], [1.18, 0.85, 0.95], colour));
  if (look.beard === "full") parts.push(oval(R * 0.22, [0, -0.44 * R, 0.9 * R], [1.3, 0.28, 0.5], colour));
  return parts;
}
