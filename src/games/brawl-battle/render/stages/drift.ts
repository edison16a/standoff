import * as THREE from "three";
import { scatter } from "./kit";

export interface DriftLook {
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** The box they drift through. */
  x: [number, number];
  y: [number, number];
  z: [number, number];
  /** Metres per second: sideways drift and fall (negative rises). */
  wind: number;
  fall: number;
  sway: number;
  spin: number;
  size: [number, number];
  seed: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

/**
 * Small things drifting through a stage: cherry petals, leaves, dust
 * motes, fireflies. Every position is worked out from the clock alone,
 * so the scene looks the same each time the showcase is filmed. One
 * instanced mesh, one draw.
 */
export function buildDrift(look: DriftLook): { mesh: THREE.InstancedMesh; update: (time: number) => void } {
  const mesh = new THREE.InstancedMesh(look.geometry, look.material, look.count);
  mesh.frustumCulled = false;
  const rng = scatter(look.seed);
  const seeds = Array.from({ length: look.count }, () => ({ x: rng(), y: rng(), z: rng(), phase: rng() * 6.28, size: rng(), spin: rng() - 0.5 }));
  const [x0, x1] = look.x;
  const [y0, y1] = look.y;
  const w = x1 - x0;
  const h = y1 - y0;
  const wrap = (v: number, span: number) => ((v % span) + span) % span;
  const update = (time: number) => {
    seeds.forEach((d, i) => {
      const x = x0 + wrap(d.x * w + look.wind * time + Math.sin(time * 0.9 + d.phase) * look.sway, w);
      const y = y0 + wrap(d.y * h - look.fall * time, h);
      const z = look.z[0] + (look.z[1] - look.z[0]) * d.z;
      const a = time * look.spin * (1 + d.spin) + d.phase;
      q.setFromEuler(e.set(a, a * 0.7, a * 0.3));
      const size = look.size[0] + (look.size[1] - look.size[0]) * d.size;
      m.compose(p.set(x, y, z), q, s.set(size, size, size));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}
