import * as THREE from "three";

/** One soft quad facing the camera: its middle, size and spin, and colour with alpha. */
export const BILLBOARD_LAYOUT = { aCentre: 3, aSizeRot: 2, aColor: 4 } as const;

/** A unit quad centred on the origin, the base every billboard copies. */
export function billboardQuad(): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(1, 1);
}

const vertex = /* glsl */ `
attribute vec3 aCentre;
attribute vec2 aSizeRot;
attribute vec4 aColor;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 mv = viewMatrix * vec4(aCentre, 1.0);
  float c = cos(aSizeRot.y);
  float s = sin(aSizeRot.y);
  vec2 p = position.xy * aSizeRot.x;
  mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vColor = aColor;
}`;

const fragment = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 texel = texture2D(map, vUv);
  gl_FragColor = vec4(vColor.rgb * texel.rgb, vColor.a * texel.a);
  if (gl_FragColor.a < 0.003) discard;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Turns every quad toward the camera in the vertex shader, so smoke puffs
 * and flash cores cost four vertices each and need no matrix work on the
 * CPU. Additive for light (flashes), normal for matter (smoke and dust).
 */
export function billboardMaterial(map: THREE.Texture, additive: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}
