import * as THREE from "three";
import { ConfettiSim, FREE, type ConfettiPhysics, type Vec } from "./confetti-sim";
import { curledCard, FOIL_COLOURS, PAPER_COLOURS } from "./confetti-geometry";

export interface ConfettiOptions {
  /** Pieces in all. Two instanced meshes draw them, so thousands are cheap. */
  count?: number;
  /** The long side of a square piece in metres. Strips are longer and thinner. */
  size?: number;
  colours?: readonly string[];
  /** Share of the pieces that are metal foil, 0 to 1. */
  foil?: number;
  physics?: Partial<ConfettiPhysics>;
  seed?: number;
}

export interface BurstOptions {
  /** Which way the cannon points. Straight up by default. */
  direction?: Vec;
  count?: number;
  /** Metres per second out of the cannon. */
  speed?: number;
  /** Half angle of the spray, radians. */
  spread?: number;
}

/**
 * Lit, tumbling paper and foil confetti. Pieces are cards with a slight
 * curl, a mix of squares and strips, that fall with real air drag (see
 * `confetti-sim.ts`), spin, skate sideways and settle flat on the floor.
 * Add `object` to a scene, then fire cannons or start a rain, and call
 * `update` every frame.
 */
export class VictoryConfetti {
  readonly object = new THREE.Group();
  readonly sim: ConfettiSim;
  private readonly paper: THREE.InstancedMesh;
  private readonly foil: THREE.InstancedMesh;
  private readonly split: number;
  private readonly scales: Float32Array;
  private readonly size: number;
  private readonly random: () => number;
  private rain: { at: Vec; radius: number; perSecond: number; owed: number } | null = null;
  private readonly matrix = new THREE.Matrix4();
  private readonly euler = new THREE.Euler();
  private readonly quaternion = new THREE.Quaternion();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private static readonly HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(options: ConfettiOptions = {}) {
    const count = options.count ?? 1400;
    this.size = options.size ?? 0.05;
    this.random = mulberry(options.seed ?? 7);
    this.sim = new ConfettiSim(count, this.random, options.physics);
    this.split = Math.round(count * (1 - (options.foil ?? 0.2)));
    const geometry = curledCard();
    this.paper = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05 }), this.split);
    this.foil = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.22, metalness: 0.9 }), Math.max(1, count - this.split));
    const colour = new THREE.Color();
    const paperColours = options.colours ?? PAPER_COLOURS;
    for (let i = 0; i < this.split; i++) this.paper.setColorAt(i, colour.set(paperColours[i % paperColours.length]!));
    for (let i = 0; i < count - this.split; i++) this.foil.setColorAt(i, colour.set(FOIL_COLOURS[i % FOIL_COLOURS.length]!));
    this.scales = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      // About a third are long strips, the rest squares and oblongs.
      const strip = this.random() < 0.33;
      this.scales[i * 2] = strip ? 0.4 + this.random() * 0.15 : 0.8 + this.random() * 0.3;
      this.scales[i * 2 + 1] = strip ? 1.8 + this.random() * 0.8 : 0.7 + this.random() * 0.4;
    }
    for (const mesh of [this.paper, this.foil]) {
      // Pieces fly all over the scene, so bounds would only ever be wrong.
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.object.add(mesh);
    }
    this.hideAll();
  }

  /** Fires one cannon. */
  burst(at: Vec, options: BurstOptions = {}): void {
    this.sim.spawn(options.count ?? 260, {
      kind: "burst",
      at,
      direction: options.direction ?? { x: 0, y: 1, z: 0 },
      speed: options.speed ?? 11,
      spread: options.spread ?? 0.35,
    });
  }

  /**
   * Cannons in a ring round `centre`, all angled in over it, the way an
   * arena fires them at the final whistle.
   */
  cannons(centre: Vec, options: { ring?: number; cannons?: number; count?: number; speed?: number } = {}): void {
    const ring = options.ring ?? 3;
    const n = options.cannons ?? 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.4;
      const at = { x: centre.x + Math.cos(a) * ring, y: centre.y, z: centre.z + Math.sin(a) * ring };
      this.burst(at, { direction: { x: -Math.cos(a) * 0.35, y: 1, z: -Math.sin(a) * 0.35 }, count: options.count ?? 220, speed: options.speed, spread: 0.3 });
    }
  }

  /** Keeps pieces falling from a disc high over `at`, `perSecond` of them, until `stopRain`. */
  startRain(at: Vec, radius: number, perSecond = 90): void {
    this.rain = { at, radius, perSecond, owed: 0 };
  }

  stopRain(): void {
    this.rain = null;
  }

  clear(): void {
    this.rain = null;
    this.sim.clear();
    this.hideAll();
  }

  update(dt: number): void {
    if (this.rain) {
      this.rain.owed += this.rain.perSecond * Math.min(0.1, dt);
      const n = Math.floor(this.rain.owed);
      this.rain.owed -= n;
      if (n > 0) this.sim.spawn(n, { kind: "rain", at: this.rain.at, radius: this.rain.radius });
    }
    this.sim.step(dt);
    const { position, rotation, state } = this.sim;
    for (let i = 0; i < this.sim.count; i++) {
      const mesh = i < this.split ? this.paper : this.foil;
      const index = i < this.split ? i : i - this.split;
      if (state[i] === FREE) {
        mesh.setMatrixAt(index, VictoryConfetti.HIDDEN);
        continue;
      }
      const o = i * 3;
      this.position.set(position[o]!, position[o + 1]!, position[o + 2]!);
      this.euler.set(rotation[o]! - Math.PI / 2, rotation[o + 1]!, rotation[o + 2]!);
      this.quaternion.setFromEuler(this.euler);
      this.scale.set(this.scales[i * 2]! * this.size, this.scales[i * 2 + 1]! * this.size, 1);
      mesh.setMatrixAt(index, this.matrix.compose(this.position, this.quaternion, this.scale));
    }
    this.paper.instanceMatrix.needsUpdate = true;
    this.foil.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.paper.geometry.dispose();
    (this.paper.material as THREE.Material).dispose();
    (this.foil.material as THREE.Material).dispose();
    this.paper.dispose();
    this.foil.dispose();
  }

  private hideAll(): void {
    for (const mesh of [this.paper, this.foil]) {
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, VictoryConfetti.HIDDEN);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/** A small seeded random, so every celebration can look the same in a capture. */
export function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
