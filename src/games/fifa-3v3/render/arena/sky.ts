import * as THREE from "three";
import { Rng } from "../../engine/rng";

/**
 * The night around the ground: a deep blue sky that glows purple at the
 * horizon, a scatter of stars, and a city skyline with lit windows.
 */
export function buildSky(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color("#03050e") }, horizon: { value: new THREE.Color("#2a2152") }, glow: { value: new THREE.Color("#6b3fa0") } },
      vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 glow; varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 c = mix(horizon, top, pow(h, 0.45));
          c += glow * pow(1.0 - h, 10.0) * 0.35;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
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
