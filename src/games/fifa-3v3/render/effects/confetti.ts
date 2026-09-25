import * as THREE from "three";
import { Rng } from "../../engine/rng";

interface Piece {
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: THREE.Euler;
  rate: THREE.Vector3;
  phase: number;
  colour: THREE.Color;
}

const COUNT = 700;
const matrix = new THREE.Matrix4();
const q = new THREE.Quaternion();
const size = new THREE.Vector3(0.09, 0.14, 1);

/**
 * Paper confetti in the team's colours and gold, blown up from cannons
 * and fluttering down over the pitch. One instanced mesh; the pieces
 * tumble so they catch the floodlights.
 */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private pieces: Piece[] = [];
  private readonly rng = new Rng(99);

  constructor() {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.45, metalness: 0.35 }),
      COUNT,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, new THREE.Color());
  }

  /**
   * Fires a burst from `from`, spreading `spread` metres, in these
   * colours. `count` pieces are added to whatever is still falling.
   */
  burst(from: THREE.Vector3, colours: readonly string[], count: number, spread: number, up = 9): void {
    const palette = colours.map((c) => new THREE.Color(c));
    const r = this.rng;
    for (let n = 0; n < count; n++) {
      const piece: Piece = {
        p: new THREE.Vector3(from.x + r.range(-1, 1) * spread * 0.2, from.y, from.z + r.range(-1, 1) * spread * 0.2),
        v: new THREE.Vector3(r.range(-1, 1) * spread * 0.6, up * r.range(0.6, 1.2), r.range(-1, 1) * spread * 0.6),
        spin: new THREE.Euler(r.next() * 6, r.next() * 6, r.next() * 6),
        rate: new THREE.Vector3(r.range(-8, 8), r.range(-8, 8), r.range(-4, 4)),
        phase: r.next() * 6,
        colour: palette[n % palette.length]!,
      };
      if (this.pieces.length >= COUNT) this.pieces.shift();
      this.pieces.push(piece);
    }
    // Older pieces shift down the list as new ones arrive, so every colour is written again.
    this.pieces.forEach((piece, i) => this.mesh.setColorAt(i, piece.colour));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    this.pieces = [];
    this.mesh.count = 0;
  }

  update(dt: number, time: number): void {
    if (this.pieces.length === 0) return;
    const keep = Math.pow(0.25, dt);
    let alive = 0;
    for (const piece of this.pieces) {
      piece.v.x *= keep;
      piece.v.z *= keep;
      // Paper falls slowly once it has lost its launch speed.
      piece.v.y = Math.max(-1.3, piece.v.y * keep - 9 * dt);
      piece.p.x += (piece.v.x + Math.sin(time * 3 + piece.phase) * 0.6) * dt;
      piece.p.y += piece.v.y * dt;
      piece.p.z += piece.v.z * dt;
      piece.spin.x += piece.rate.x * dt;
      piece.spin.y += piece.rate.y * dt;
      piece.spin.z += piece.rate.z * dt;
      if (piece.p.y < 0.01) {
        piece.p.y = 0.01;
        piece.spin.x = -Math.PI / 2;
        piece.rate.set(0, 0, 0);
      }
      matrix.compose(piece.p, q.setFromEuler(piece.spin), size);
      this.mesh.setMatrixAt(alive++, matrix);
    }
    this.mesh.count = alive;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
