import * as THREE from "three";
import type { V3 } from "../geo";
import { REGIONS } from "../kit/atlas-layout";
import { part } from "../kit/part";
import { sphere } from "../kit/shapes";

export interface EyeLook {
  /** Middle point between the eyes, on the face. */
  at: V3;
  spread: number;
  size: number;
  iris: string;
  /** Skin or fur colour of the lids. */
  lid?: string;
  /** How far the upper lids close, 0 open to about 0.5 for a focused racer's look. */
  droop?: number;
  /** Turn each eye outward a little, radians, on a wide face. */
  splay?: number;
}

/**
 * Big glossy cartoon eyes: a wet white ball, a textured iris with its
 * pupil, a sharp catch light, and upper lids that give the face its
 * mood. The clear coat on the eyeball catches the sky, so they sparkle.
 */
export function eyes(e: EyeLook): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const yaw = side * (e.splay ?? 0.18);
    const centre = new THREE.Vector3(e.at[0] + side * e.spread, e.at[1], e.at[2]);
    parts.push(part(sphere(e.size, 24, 18), "#fbfbfb", { finish: "eye", at: [centre.x, centre.y, centre.z] }));
    parts.push(part(irisCap(e.size), e.iris, { finish: "eye", region: REGIONS.eye, at: [centre.x, centre.y, centre.z], rot: [0, yaw, 0] }));
    parts.push(part(sphere(e.size * 0.13, 10, 8), "#ffffff", { finish: "lamp", at: [centre.x + e.size * 0.28, centre.y + e.size * 0.32, centre.z + e.size * 0.88] }));
    if (e.lid) {
      const droop = e.droop ?? 0.25;
      // An upper lid: a slightly bigger shell over the top of the eye, tilted down at the inner corner.
      const lid = new THREE.SphereGeometry(e.size * 1.08, 24, 10, 0, Math.PI * 2, 0, Math.PI * (0.22 + droop * 0.6));
      parts.push(part(lid, e.lid, { finish: "fur", at: [centre.x, centre.y, centre.z], rot: [0.05, yaw, side * -0.14] }));
    }
  }
  return parts;
}

/** The iris as a cap hugging the front of the eyeball, facing +z, with the picture laid flat across it. */
function irisCap(size: number): THREE.BufferGeometry {
  const spread = 0.66;
  const r = size * 1.012;
  const g = new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, 0, spread);
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const half = r * Math.sin(spread);
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * half) + 0.5, -pos.getZ(i) / (2 * half) + 0.5);
  return g.rotateX(Math.PI / 2);
}
