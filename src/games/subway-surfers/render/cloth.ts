import * as THREE from "three";
import { toon } from "./toon";

/**
 * What a character's surface is woven from. Plain is the yard's flat toon
 * paint. Denim has a fine diagonal twill and a faded fleck, fleece a soft
 * mottle, and shine adds a hard cartoon glint, for eyes, rubber and plastic.
 * The weave rides on each vertex, so a whole bone of many fabrics still
 * draws in one call.
 */
export const WEAVE = { plain: 0, denim: 1, fleece: 2, shine: 3 } as const;
export type Weave = keyof typeof WEAVE;

const VERTEX_PARS = /* glsl */ `
attribute float weave;
varying float vWeave;
varying vec3 vCloth;
`;

const VERTEX = /* glsl */ `
vWeave = weave;
vCloth = position;
`;

const FRAGMENT_PARS = /* glsl */ `
varying float vWeave;
varying vec3 vCloth;
float clothHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
// Fades a pattern out as it gets finer than a few pixels, so it never shimmers far off.
float clothFade(float phase) {
  return clamp(1.6 - fwidth(phase) * 0.9, 0.0, 1.0);
}
`;

// Twill and fleck tint the paint before lighting, so the toon bands still shade them.
const PAINT = /* glsl */ `
if (vWeave > 0.5 && vWeave < 1.5) {
  float phase = (vCloth.x * 0.7 + vCloth.y + vCloth.z * 0.7) * 520.0;
  float twill = 0.5 + 0.5 * sin(phase);
  float fleck = clothHash(floor(vCloth * 260.0));
  float fade = clothFade(phase);
  diffuseColor.rgb *= 1.0 - fade * (0.11 * twill - 0.1 * step(0.86, fleck));
} else if (vWeave > 1.5 && vWeave < 2.5) {
  float mottle = clothHash(floor(vCloth * 140.0));
  diffuseColor.rgb *= 1.0 - 0.05 * mottle * clothFade(vCloth.y * 880.0);
}
`;

// The glint is fixed to the view, the way cartoon shine always sits up and to one side.
const SHINE = /* glsl */ `
if (vWeave > 2.5) {
  float glint = smoothstep(0.93, 0.96, dot(normal, normalize(vec3(-0.35, 0.55, 0.76))));
  outgoingLight += vec3(0.32) * glint;
}
`;

let material: THREE.MeshToonMaterial | null = null;

/** The one cloth material every character part shares: toon shading, vertex colours and the weave. */
export function clothMaterial(): THREE.MeshToonMaterial {
  if (material) return material;
  material = toon({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${PAINT}`)
      .replace("#include <opaque_fragment>", `${SHINE}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => "runner-cloth";
  material.userData.shared = true;
  return material;
}

/** A weave attribute for a part of `count` vertices. */
export function weaveAttribute(weave: Weave, count: number): THREE.BufferAttribute {
  return new THREE.BufferAttribute(new Float32Array(count).fill(WEAVE[weave]), 1);
}
