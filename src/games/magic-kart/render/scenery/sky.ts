import * as THREE from "three";
import type { Theme } from "../themes";

/**
 * A sky dome with a vertical gradient and a soft glow where the sun is.
 * One shader on one sphere, drawn behind everything and ignoring fog, so
 * the horizon blends into the fog colour without a seam.
 */
export function buildSky(theme: Theme, sunDir: THREE.Vector3, stars = 0): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(theme.skyTop) },
      bottom: { value: new THREE.Color(theme.skyBottom) },
      sun: { value: new THREE.Color(theme.sun) },
      sunDir: { value: sunDir.clone().normalize() },
      stars: { value: stars },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 bottom;
      uniform vec3 sun;
      uniform vec3 sunDir;
      uniform float stars;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        float h = clamp(vDir.y * 1.4 + 0.15, 0.0, 1.0);
        vec3 col = mix(bottom, top, pow(h, 0.8));
        float glow = max(dot(vDir, sunDir), 0.0);
        col += sun * (pow(glow, 64.0) * 1.2 + pow(glow, 6.0) * 0.18);
        if (stars > 0.0) {
          vec3 cell = floor(vDir * 180.0);
          float s = hash(cell);
          col += vec3(step(1.0 - 0.012 * stars, s)) * (0.6 + 0.4 * hash(cell + 3.1)) * smoothstep(-0.1, 0.3, vDir.y + 0.3);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}
