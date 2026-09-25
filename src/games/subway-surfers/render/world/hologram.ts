import * as THREE from "three";
import { holoArtTexture } from "../art/night-art";

const VERTEX = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 color;
  uniform vec3 edge;
  uniform float time;
  #include <common>
  #include <fog_pars_fragment>
  varying vec2 vUv;
  void main() {
    // Each line of the picture slips sideways now and then, like a signal losing lock.
    float glitch = step(0.985, fract(sin(floor(time * 7.0) * 12.9898 + floor(vUv.y * 24.0)) * 43758.5)) * 0.03;
    vec2 uv = vUv + vec2(glitch, 0.0);
    float art = texture2D(map, uv).a;
    float lines = 0.72 + 0.28 * sin(vUv.y * 220.0 - time * 9.0);
    float flicker = 0.88 + 0.12 * sin(time * 23.0) * sin(time * 7.3);
    float body = 0.12 + 0.1 * (1.0 - vUv.y);
    vec3 tint = mix(color, edge, vUv.x);
    vec3 light = tint * (art * 1.6 + body) * lines * flicker;
    gl_FragColor = vec4(light, 1.0);
    // It adds light, so the haze dims it toward nothing rather than toward the fog colour.
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      #else
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      #endif
      gl_FragColor.rgb *= 1.0 - fogFactor;
    #endif
  }
`;

const materials = new Map<string, THREE.ShaderMaterial>();
const clock = { value: 0 };

/**
 * A holographic billboard's light: its picture in the zone's colours,
 * with scan lines, a flicker and the odd glitch, added onto whatever is
 * behind it. One material per picture and palette, all sharing a clock.
 */
export function hologramMaterial(art: number, color: number, edge: number): THREE.ShaderMaterial {
  const key = `${art % 4}-${color}-${edge}`;
  let material = materials.get(key);
  if (!material) {
    material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { color: { value: new THREE.Color(color) }, edge: { value: new THREE.Color(edge) }, map: { value: null } }]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      toneMapped: false,
    });
    material.uniforms.map!.value = holoArtTexture(art);
    // Every hologram shares one clock, so ticking it once a frame moves them all.
    material.uniforms.time = clock;
    material.userData.shared = true;
    materials.set(key, material);
  }
  return material;
}

/** Moves every hologram's scan lines and flicker on. Called once a frame. */
export function tickHolograms(time: number): void {
  clock.value = time;
}
