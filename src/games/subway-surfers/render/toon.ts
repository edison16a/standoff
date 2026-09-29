import * as THREE from "three";

/**
 * The cartoon look shared by the whole yard: soft banded toon shading
 * from one gradient, and one dark ink for the outlines round the trains,
 * barriers, trees and people.
 */

/** The outline colour: a deep navy, softer than black against the sunny yard. */
export const INK = 0x1f2138;

let gradient: THREE.DataTexture | null = null;
let ink: THREE.MeshBasicMaterial | null = null;

function smooth(a: number, b: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** How much sun a surface catches at a point along the toon ramp, from facing away (0) to facing the sun (1). */
export function toonLevel(t: number): number {
  // A shade band, a quick soft edge into the light, then a gentle roll up to full sun.
  return 0.1 + 0.6 * smooth(0.42, 0.54, t) + 0.3 * smooth(0.6, 0.86, t);
}

/** The ramp as a texture, filtered so the band edges stay soft rather than stepped. */
export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const size = 64;
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const v = Math.round(toonLevel(i / (size - 1)) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  gradient = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.LinearFilter;
  gradient.magFilter = THREE.LinearFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  gradient.userData.shared = true;
  return gradient;
}

/** A toon material on the shared ramp. Cheap to draw: no reflections, no specular. */
export function toon(params: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...params });
}

/**
 * The ink for outline hulls: a copy of a shape grown a little and drawn
 * inside out, so only its rim shows round the edge. The haze fades it
 * with everything else far down the track.
 */
export function inkMaterial(): THREE.MeshBasicMaterial {
  if (!ink) {
    ink = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, fog: true });
    ink.userData.shared = true;
  }
  return ink;
}
