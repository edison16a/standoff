import * as THREE from "three";

/**
 * One glowing streak: its bright head, its tail, the width at each end,
 * colour with alpha, and its look (how much soft glow surrounds the core,
 * and how the brightness runs along it).
 */
export const STREAK_LAYOUT = { aHead: 3, aTail: 3, aWidth: 2, aColor: 4, aShape: 2 } as const;

/** The base quad: x runs 0 at the tail to 1 at the head, y runs across from -1 to 1. */
export function streakQuad(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  return geo;
}

const vertex = /* glsl */ `
attribute vec3 aHead;
attribute vec3 aTail;
attribute vec2 aWidth;
attribute vec4 aColor;
attribute vec2 aShape;
uniform float uAspect;
varying vec2 vUv;
varying vec4 vColor;
varying vec2 vShape;
void main() {
  mat4 pv = projectionMatrix * viewMatrix;
  vec4 h = pv * vec4(aHead, 1.0);
  vec4 t = pv * vec4(aTail, 1.0);
  // A tail behind the eye would flip across the screen, so pull it forward along the streak.
  float near = 0.06;
  if (t.w < near && h.w > near) t = mix(t, h, (near - t.w) / (h.w - t.w));
  vec2 dir = (h.xy / h.w - t.xy / t.w) * vec2(uAspect, 1.0);
  float len = length(dir);
  dir = len > 1e-5 ? dir / len : vec2(0.0, 1.0);
  vec2 across = vec2(-dir.y, dir.x);
  bool head = position.x > 0.5;
  vec4 at = head ? h : t;
  // Width is in metres, so it shrinks with distance like anything else in the world.
  float w = (head ? aWidth.x : aWidth.y) * projectionMatrix[1][1] * 0.5;
  // Each end is capped by half a width, so a round flying straight away still shows as a dot.
  vec2 offset = (across * position.y + dir * (head ? 1.0 : -1.0)) * w;
  offset.x /= uAspect;
  at.xy += offset;
  gl_Position = at;
  vUv = position.xy;
  vColor = aColor;
  vShape = aShape;
}`;

const fragment = /* glsl */ `
varying vec2 vUv;
varying vec4 vColor;
varying vec2 vShape;
void main() {
  float a = abs(vUv.y);
  float core = exp(-a * a * 14.0);
  float glow = exp(-a * a * 2.2) * vShape.x;
  // Kept off zero, since pow(0, 0) is undefined in GLSL.
  float x = clamp(vUv.x, 0.0001, 0.9999);
  // Positive shapes brighten toward the head (a tracer), negative toward the tail (a flame petal).
  float along = vShape.y >= 0.0 ? pow(x, vShape.y) : pow(1.0 - x, -vShape.y);
  float i = (core + glow) * along * vColor.a;
  if (i < 0.003) discard;
  // White hot in the core, the colour toward the edges.
  vec3 colour = mix(vColor.rgb, vec3(1.0, 0.97, 0.9), core * core * 0.6);
  gl_FragColor = vec4(colour, min(1.0, i));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Glowing streaks expanded in screen space from their two end points:
 * tracer rounds and the petals of a muzzle flash. Expanding on screen
 * keeps a streak that points at the camera from vanishing edge on.
 */
export function streakMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uAspect: { value: 16 / 9 } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Keeps a streak mesh's aspect uniform in step with whichever camera draws it. */
export function trackAspect(mesh: THREE.Mesh, material: THREE.ShaderMaterial): void {
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    if (camera instanceof THREE.PerspectiveCamera) material.uniforms.uAspect!.value = camera.aspect;
  };
}
