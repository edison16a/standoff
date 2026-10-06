import * as THREE from "three";

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Pinned to the far plane so the dome never cuts into the roof.
  gl_Position = p.xyww;
}
`;

const FRAGMENT = /* glsl */ `
varying vec3 vDir;
float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash3(vec3(i, 1.0));
  float b = hash3(vec3(i + vec2(1.0, 0.0), 1.0));
  float c = hash3(vec3(i + vec2(0.0, 1.0), 1.0));
  float d = hash3(vec3(i + vec2(1.0, 1.0), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  // Deep navy overhead, a lighter haze low down where the city and the stadium's own lights glow.
  vec3 c = mix(vec3(0.045, 0.05, 0.075), vec3(0.006, 0.009, 0.024), smoothstep(0.0, 0.65, up));
  c += vec3(0.05, 0.035, 0.03) * exp(-up * 9.0);
  // Thin cloud lit from beneath by the floods, drifting nowhere: it is baked.
  vec2 q = d.xz / max(0.15, d.y) * 1.4;
  float cloud = smoothstep(0.55, 0.9, noise(q) * 0.65 + noise(q * 2.7) * 0.35);
  c += vec3(0.03, 0.03, 0.035) * cloud * smoothstep(0.05, 0.35, up);
  // A few stars, hidden where the cloud is.
  vec3 cell = floor(d * 220.0);
  float star = step(0.9975, hash3(cell)) * smoothstep(0.15, 0.5, up) * (1.0 - cloud);
  c += vec3(0.5, 0.52, 0.6) * star * hash3(cell + 3.1);
  gl_FragColor = vec4(c, 1.0);
}
`;

/**
 * The night sky over the open roof: a gradient from a hazy glow at the
 * horizon to deep navy overhead, faint cloud lit from below and a few
 * stars. One cheap draw, drawn first and pinned behind everything.
 */
export function nightSky(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}
