import * as THREE from "three";
import { Rng } from "../../engine/rng";

/**
 * The night around the ground: a deep blue sky with drifting cloud lit
 * from below by the city, the floodlights' haze rising over the bowl, a
 * moon, a scatter of stars, and a city skyline with lit windows.
 */
export function buildSky(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 16), skyMaterial());
  const rng = new Rng(21);
  const stars = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = rng.next() * Math.PI * 2;
    const h = 0.15 + rng.next() * 0.85;
    const r = Math.sqrt(1 - h * h);
    stars.set([Math.cos(a) * r * 220, h * 220, Math.sin(a) * r * 220], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  const starMat = new THREE.PointsMaterial({ color: "#dfe6ff", size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 });
  const skylineMap = skylineTexture();
  const skyline = new THREE.Mesh(
    new THREE.CylinderGeometry(150, 150, 34, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: skylineMap, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  skyline.position.y = 15;
  group.add(dome, new THREE.Points(starGeo, starMat), skyline);
  return {
    group,
    dispose() {
      dome.geometry.dispose();
      (dome.material as THREE.Material).dispose();
      starGeo.dispose();
      starMat.dispose();
      skyline.geometry.dispose();
      (skyline.material as THREE.Material).dispose();
      skylineMap.dispose();
    },
  };
}

function skylineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const rng = new Rng(8);
  let x = 0;
  while (x < canvas.width) {
    const w = 30 + rng.next() * 90;
    const h = 40 + rng.next() * 170;
    ctx.fillStyle = `rgb(${10 + rng.next() * 8},${11 + rng.next() * 8},${22 + rng.next() * 12})`;
    ctx.fillRect(x, canvas.height - h, w, h);
    for (let wy = canvas.height - h + 8; wy < canvas.height - 6; wy += 9) {
      for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        if (!rng.chance(0.28)) continue;
        ctx.fillStyle = rng.chance(0.7) ? "rgba(255,214,140,0.85)" : "rgba(170,210,255,0.8)";
        ctx.fillRect(wx, wy, 3, 4);
      }
    }
    x += w + rng.next() * 12;
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uCity;
  uniform vec3 uMoon;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 c = mix(uHorizon, uTop, pow(h, 0.5));
    // The city's sodium glow along the horizon, and the floodlights' haze hanging over the ground.
    c += uCity * pow(1.0 - h, 8.0) * 0.6;
    c += vec3(0.05, 0.055, 0.07) * pow(1.0 - h, 2.0);
    // Clouds: two octaves of noise on a flat layer above, lit warm from below.
    vec2 p = d.xz / max(d.y, 0.08) * 1.4;
    float n = noise(p) * 0.65 + noise(p * 2.7 + 3.1) * 0.35;
    float cloud = smoothstep(0.5, 0.85, n) * smoothstep(0.02, 0.25, h);
    c = mix(c, uCity * 0.35 + vec3(0.03, 0.035, 0.05), cloud * 0.75);
    // The moon, high over the far stand, with a soft halo.
    vec3 moonDir = normalize(vec3(-0.35, 0.55, -0.76));
    float m = dot(d, moonDir);
    c += uMoon * (smoothstep(0.99955, 0.9997, m) * 6.0 + pow(max(m, 0.0), 300.0) * 0.25) * (1.0 - cloud * 0.8);
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** The dome's colours are linear light: the finish's curve and grade bring them to the screen. */
function skyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color("#02040b") },
      uHorizon: { value: new THREE.Color("#141a33") },
      uCity: { value: new THREE.Color("#6b4a32") },
      uMoon: { value: new THREE.Color("#e8ecf5") },
    },
    vertexShader: "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: SKY_FRAGMENT,
  });
}
