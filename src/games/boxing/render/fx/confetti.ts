import * as THREE from "three";
import { seeded } from "../../engine/random";

const COUNT = 700;
const COLOURS = ["#f5c542", "#ffffff", "#d7263d", "#1e63d6", "#9b45f0", "#2ecc71", "#ff8a3a"];

interface Piece {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  rotation: THREE.Euler;
  flutter: number;
  alive: boolean;
}

/**
 * Paper confetti for the winner: small coloured squares that tumble and
 * flutter down from the lighting truss and settle on the canvas. One
 * instanced mesh, so hundreds of pieces cost one draw.
 */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private readonly pieces: Piece[] = [];
  private readonly random = seeded(77);
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private active = false;

  constructor() {
    const geometry = new THREE.PlaneGeometry(0.05, 0.035);
    const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    this.mesh.frustumCulled = false;
    const colour = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      this.mesh.setColorAt(i, colour.set(COLOURS[i % COLOURS.length]!));
      this.pieces.push({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), spin: new THREE.Vector3(), rotation: new THREE.Euler(), flutter: 0, alive: false });
    }
    this.hideAll();
  }

  /** Showers the ring from above, centred on a boxer. */
  burst(x: number, z: number): void {
    const r = this.random;
    for (const p of this.pieces) {
      p.alive = true;
      p.position.set(x + (r() - 0.5) * 5, 5 + r() * 3, z + (r() - 0.5) * 5);
      p.velocity.set((r() - 0.5) * 1.5, -0.5 - r() * 1.5, (r() - 0.5) * 1.5);
      p.spin.set((r() - 0.5) * 12, (r() - 0.5) * 12, (r() - 0.5) * 12);
      p.rotation.set(r() * 6, r() * 6, r() * 6);
      p.flutter = r() * 10;
    }
    this.active = true;
  }

  update(dt: number, time: number): void {
    if (!this.active) return;
    for (let i = 0; i < COUNT; i++) {
      const p = this.pieces[i]!;
      if (!p.alive) continue;
      if (p.position.y > 0.01) {
        // Paper falls slowly and drifts from side to side as it tumbles.
        p.velocity.y = Math.max(-1.1, p.velocity.y - 3 * dt);
        p.position.addScaledVector(p.velocity, dt);
        p.position.x += Math.sin(time * 3 + p.flutter) * 0.4 * dt;
        p.rotation.x += p.spin.x * dt;
        p.rotation.y += p.spin.y * dt;
        p.rotation.z += p.spin.z * dt;
      } else {
        p.position.y = 0.01;
        p.rotation.set(-Math.PI / 2, 0, p.flutter);
      }
      this.quaternion.setFromEuler(p.rotation);
      this.matrix.compose(p.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.active = false;
    for (const p of this.pieces) p.alive = false;
    this.hideAll();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  private hideAll(): void {
    this.matrix.makeScale(0, 0, 0);
    for (let i = 0; i < COUNT; i++) this.mesh.setMatrixAt(i, this.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
