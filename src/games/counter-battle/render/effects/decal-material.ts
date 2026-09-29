import * as THREE from "three";
import { ATLAS_GRID, drawDecalAtlas } from "./decal-atlas";

/** Seconds a drip takes to run its full length down a wall. */
const DRIP_SECONDS = 2.2;
/** Seconds a fresh splat takes to spread to full size. */
const SPREAD_SECONDS = 0.07;

/**
 * Per splat, in one instanced attribute: which atlas cell, when it
 * landed (battle time), and how much it curves round the surface.
 */
export const DECAL_ATTRIBUTE = "aDecal";

let atlas: THREE.DataTexture | null = null;

/** The splat atlas as a texture, drawn the first time it is needed and shared after. */
function atlasTexture(): THREE.DataTexture {
  if (atlas) return atlas;
  const size = 1024;
  // Rows come top down; the texture wants the bottom row first, so the drips run down the plane.
  atlas = new THREE.DataTexture(drawDecalAtlas(size), size, size, THREE.RGBAFormat);
  atlas.flipY = false;
  const rows = atlas.image.data as Uint8Array;
  const flipped = new Uint8Array(rows.length);
  const stride = size * 4;
  for (let y = 0; y < size; y++) flipped.set(rows.subarray(y * stride, (y + 1) * stride), (size - 1 - y) * stride);
  atlas.image.data = flipped;
  atlas.generateMipmaps = true;
  atlas.minFilter = THREE.LinearMipmapLinearFilter;
  atlas.magFilter = THREE.LinearFilter;
  atlas.anisotropy = 8;
  atlas.needsUpdate = true;
  return atlas;
}

/**
 * Wet paint for splats. A standard material, so the sun, shadows and
 * sky light it like everything else, with three additions in its
 * shaders: each splat picks its shape from the atlas, bends to hug a
 * rounded surface, and its drips run down over the first seconds.
 * `time` is the battle clock, set each frame.
 */
export class DecalMaterial extends THREE.MeshStandardMaterial {
  readonly time = { value: 0 };

  constructor() {
    super({ transparent: true, depthWrite: false, roughness: 0.28, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const map = atlasTexture();
    this.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.time;
      shader.uniforms.uDecals = { value: map };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute vec3 ${DECAL_ATTRIBUTE};
attribute vec2 decalUv;
uniform float uTime;
varying vec2 vDecalUv;
varying float vDecalAge;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
vDecalAge = uTime - ${DECAL_ATTRIBUTE}.y;
transformed.xy *= mix(0.55, 1.0, clamp(vDecalAge / ${SPREAD_SECONDS.toFixed(3)}, 0.0, 1.0));
transformed.z -= 0.5 * ${DECAL_ATTRIBUTE}.z * transformed.x * transformed.x;
float tile = ${DECAL_ATTRIBUTE}.x;
vec2 cell = vec2(mod(tile, ${ATLAS_GRID.toFixed(1)}), ${(ATLAS_GRID - 1).toFixed(1)} - floor(tile / ${ATLAS_GRID.toFixed(1)}));
vDecalUv = (cell + decalUv) / ${ATLAS_GRID.toFixed(1)};`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform sampler2D uDecals;
varying vec2 vDecalUv;
varying float vDecalAge;`,
        )
        .replace(
          "#include <map_fragment>",
          `vec4 decal = texture2D(uDecals, vDecalUv);
// Drips run down fast at first and slow as they thin out.
float run = 1.0 - pow(1.0 - clamp(vDecalAge / ${DRIP_SECONDS.toFixed(2)}, 0.0, 1.0), 2.0);
float dripShown = decal.g < 0.004 ? 1.0 : smoothstep(0.0, 0.04, run - decal.g);
float cover = decal.a * dripShown;
if (cover < 0.03) discard;
diffuseColor.rgb *= mix(0.5, 1.1, decal.r);
diffuseColor.a *= cover;`,
        );
    };
  }
}

/** A square of subdivided plane, so a splat can bend round a curve, with its own copy of the uvs. */
export function decalGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(1, 1, 6, 6);
  geo.setAttribute("decalUv", geo.getAttribute("uv").clone());
  return geo;
}
