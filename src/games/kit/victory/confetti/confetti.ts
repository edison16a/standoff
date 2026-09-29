import * as THREE from "three";
import { seededRandom } from "../random";
import { ConfettiSim, type CannonOptions, type ConfettiTuning, type ShowerOptions } from "./confetti-sim";

/** Gold, white, and a bright mix that reads on any stage. */
export const CONFETTI_COLOURS = ["#f5c542", "#ffffff", "#e63946", "#2f6fed", "#9b5de5", "#2ecc71", "#ff8a3a", "#ffd6e8"];

export interface ConfettiOptions {
  /** How many pieces at most. The oldest are reused once all are out. 2400 by default. */
  count?: number;
  colours?: readonly string[];
  /** Share of pieces made of shiny foil rather than paper, 0 to 1. Foil catches the spotlights. */
  foil?: number;
  /** Piece size in metres. */
  size?: number;
  seed?: number;
  tuning?: Partial<ConfettiTuning>;
}

/**
 * Lots of confetti for a winner: paper and foil pieces that burst out of
 * cannons or shower from the roof, fall with air drag, sway and tumble,
 * catch the light and settle on the floor. Two instanced meshes (matte
 * paper and metallic foil), so thousands of pieces are two draws.
 *
 *   const confetti = new VictoryConfetti({ count: 3000 });
 *   scene.add(confetti.group);
 *   confetti.shower({ centre: { x: 0, y: 0, z: 0 }, radius: 4, height: 6, count: 1200 });
 *   confetti.update(dt, time);   // every frame
 */
export class VictoryConfetti {
  readonly group = new THREE.Group();
  readonly sim: ConfettiSim;
  private readonly paper: THREE.InstancedMesh;
  private readonly foil: THREE.InstancedMesh;
  /** Which mesh and which instance each piece draws as. */
  private readonly slot: Int32Array;
  private readonly scales: Float32Array;
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private time = 0;

  constructor(options: ConfettiOptions = {}) {
    const count = options.count ?? 2400;
    const size = options.size ?? 0.045;
    const colours = options.colours ?? CONFETTI_COLOURS;
    const foilShare = options.foil ?? 0.3;
    this.sim = new ConfettiSim(count, options.seed ?? 7, options.tuning);
    const geometry = paperGeometry(size);
    const paperMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.62, metalness: 0.05 });
    const foilMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.22, metalness: 0.85, envMapIntensity: 1.4 });
    const r = seededRandom((options.seed ?? 7) + 11);
    const foilCount = Math.round(count * foilShare);
    this.paper = new THREE.InstancedMesh(geometry, paperMaterial, count - foilCount);
    this.foil = new THREE.InstancedMesh(geometry, foilMaterial, Math.max(1, foilCount));
    this.slot = new Int32Array(count);
    this.scales = new Float32Array(count);
    const colour = new THREE.Color();
    let paperN = 0;
    let foilN = 0;
    for (let i = 0; i < count; i++) {
      // Foil is spread through the pieces, so every burst has some.
      const isFoil = foilN < foilCount && (i * foilShare) % 1 < foilShare;
      colour.set(colours[Math.floor(r() * colours.length)]!);
      if (isFoil) {
        this.foil.setColorAt(foilN, colour);
        this.slot[i] = -(foilN++ + 1);
      } else {
        this.paper.setColorAt(paperN, colour);
        this.slot[i] = paperN++;
      }
      this.scales[i] = 0.7 + r() * 0.6;
    }
    for (const mesh of [this.paper, this.foil]) {
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.group.add(mesh);
    }
    this.hideAll();
  }

  shower(options: ShowerOptions): void {
    this.sim.shower(options);
  }

  cannon(options: CannonOptions): void {
    this.sim.cannon(options);
  }

  /** Steps the pieces and moves their instances. `time` in seconds drives the sway. */
  update(dt: number, time?: number): void {
    this.time = time ?? this.time + dt;
    const sim = this.sim;
    sim.step(Math.min(dt, 0.1), this.time);
    for (let i = 0; i < sim.capacity; i++) {
      const k = i * 3;
      if (sim.state[i]) {
        this.position.set(sim.position[k]!, sim.position[k + 1]!, sim.position[k + 2]!);
        this.euler.set(sim.rotation[k]!, sim.rotation[k + 1]!, sim.rotation[k + 2]!);
        this.quaternion.setFromEuler(this.euler);
        this.scale.setScalar(this.scales[i]!);
        this.matrix.compose(this.position, this.quaternion, this.scale);
      } else this.matrix.makeScale(0, 0, 0);
      const slot = this.slot[i]!;
      if (slot >= 0) this.paper.setMatrixAt(slot, this.matrix);
      else this.foil.setMatrixAt(-slot - 1, this.matrix);
    }
    this.paper.instanceMatrix.needsUpdate = true;
    this.foil.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.sim.clear();
    this.hideAll();
  }

  dispose(): void {
    this.paper.geometry.dispose();
    (this.paper.material as THREE.Material).dispose();
    (this.foil.material as THREE.Material).dispose();
    this.paper.dispose();
    this.foil.dispose();
  }

  private hideAll(): void {
    this.matrix.makeScale(0, 0, 0);
    for (let i = 0; i < this.paper.count; i++) this.paper.setMatrixAt(i, this.matrix);
    for (let i = 0; i < this.foil.count; i++) this.foil.setMatrixAt(i, this.matrix);
    this.paper.instanceMatrix.needsUpdate = true;
    this.foil.instanceMatrix.needsUpdate = true;
  }
}

/** A small rectangle with a gentle curl, so it catches light unevenly as it turns. */
function paperGeometry(size: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(size, size * 0.62, 4, 1);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) / size;
    positions.setZ(i, x * x * size * 0.35);
  }
  geometry.computeVertexNormals();
  return geometry;
}
