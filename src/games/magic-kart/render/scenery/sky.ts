import * as THREE from "three";
import { softDot } from "../textures";
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
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 1.4 + 0.15, 0.0, 1.0);
        vec3 col = mix(bottom, top, pow(h, 0.8));
        float glow = max(dot(vDir, sunDir), 0.0);
        col += sun * (pow(glow, 64.0) * 1.2 + pow(glow, 6.0) * 0.18);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), material);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  if (stars > 0) mesh.add(starField(Math.round(2600 * stars)));
  return mesh;
}

/**
 * Round, twinkle sized stars scattered over the dome, as points that ride
 * along with the sky. Points stay crisp and round at any resolution,
 * where stars painted in the sky shader came out as blocky squares.
 */
function starField(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  // A fixed pattern, so the sky is the same every time the map is shown.
  let seed = 12345;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(1 - Math.min(1, y * y));
    positions.set([Math.cos(a) * r * 820, y * 820, Math.sin(a) * r * 820], i * 3);
    const pick = random();
    tint.set(pick < 0.7 ? "#ffffff" : pick < 0.85 ? "#bfe0ff" : "#ffd6f4").multiplyScalar(0.55 + random() * 0.45);
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, vertexColors: true, map: softDot(), transparent: true, depthWrite: false, fog: false, toneMapped: false }),
  );
  points.renderOrder = -9;
  points.frustumCulled = false;
  return points;
}
