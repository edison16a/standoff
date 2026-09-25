import * as THREE from "three";
import { beamTexture, ringTexture, starTexture } from "./textures";

export type PulseKind = "star" | "ring" | "beam" | "streak";

export interface PulseSpec {
  kind: PulseKind;
  x: number;
  y: number;
  z?: number;
  colour: string;
  /** Size at the start and at the end of its life, in metres. */
  from: number;
  to: number;
  life: number;
  /** Turn in the screen plane, radians, and how fast it spins. */
  angle?: number;
  spin?: number;
  /** Width over length, for beams and streaks. */
  thin?: number;
  opacity?: number;
}

interface Pulse {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  spec: PulseSpec;
  age: number;
}

const POOL = 48;

/**
 * Flat glowing shapes that face the camera and grow as they fade: the
 * impact star of a hit, the shockwave ring of a heavy one, the long
 * beam of a KO and the streak of a sword cut. A fixed pool, so a busy
 * fight makes no garbage; the oldest is reused when it runs out.
 */
export class Pulses {
  readonly group = new THREE.Group();
  private readonly pool: Pulse[] = [];
  private readonly textures: Record<PulseKind, THREE.Texture>;
  private readonly centred = new THREE.PlaneGeometry(1, 1);
  private readonly anchored = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
  private next = 0;

  constructor() {
    const beam = beamTexture();
    this.textures = { star: starTexture(), ring: ringTexture(), beam, streak: beam };
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const mesh = new THREE.Mesh(this.centred, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.pool.push({ mesh, spec: { kind: "star", x: 0, y: 0, colour: "#fff", from: 0, to: 0, life: 0 }, age: 1e9 });
    }
  }

  spawn(spec: PulseSpec): void {
    const p = this.pool[this.next]!;
    this.next = (this.next + 1) % POOL;
    p.spec = spec;
    p.age = 0;
    const m = p.mesh;
    // A beam grows out from its end at the blast line; everything else grows from its middle.
    m.geometry = spec.kind === "beam" ? this.anchored : this.centred;
    m.material.map = this.textures[spec.kind];
    m.material.color.set(spec.colour);
    m.material.needsUpdate = true;
    m.position.set(spec.x, spec.y, spec.z ?? 0.6);
    m.rotation.set(0, 0, spec.angle ?? 0);
    m.visible = true;
    this.shape(p, 0);
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      p.age += dt;
      if (p.age >= p.spec.life) {
        p.mesh.visible = false;
        continue;
      }
      this.shape(p, p.age / p.spec.life);
      if (p.spec.spin) p.mesh.rotation.z += p.spec.spin * dt;
    }
  }

  clear(): void {
    for (const p of this.pool) p.mesh.visible = false;
  }

  private shape(p: Pulse, u: number): void {
    const { spec } = p;
    const ease = 1 - (1 - u) * (1 - u);
    const size = spec.from + (spec.to - spec.from) * ease;
    const thin = spec.thin ?? 1;
    p.mesh.scale.set(size, size * thin, 1);
    p.mesh.material.opacity = (spec.opacity ?? 1) * (1 - u * u);
  }

  dispose(): void {
    this.centred.dispose();
    this.anchored.dispose();
    for (const p of this.pool) p.mesh.material.dispose();
    for (const t of new Set(Object.values(this.textures))) t.dispose();
  }
}
