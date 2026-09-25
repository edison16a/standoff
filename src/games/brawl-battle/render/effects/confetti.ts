import * as THREE from "three";

const MAX = 600;

interface Piece {
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  life: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3(1, 1, 1);
const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
const tint = new THREE.Color();

/**
 * Paper confetti for the winner: blasted up from cannons at both ends of
 * the stage and fluttering down in front of it, each piece tumbling as
 * it falls. One instanced mesh, one draw.
 */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private readonly pieces: Piece[] = [];

  constructor() {
    const geo = new THREE.PlaneGeometry(0.12, 0.2);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, tint.set("#ffffff"));
  }

  /** Blasts `count` pieces from a point, up and in toward `aim`. */
  fire(x: number, y: number, aim: number, colours: readonly string[], count: number, rng: () => number): void {
    for (let n = 0; n < count && this.pieces.length < MAX; n++) {
      const spread = (rng() - 0.5) * 6;
      this.pieces.push({
        p: new THREE.Vector3(x, y, 1 + rng() * 3),
        v: new THREE.Vector3((aim - x) * (0.35 + rng() * 0.4) + spread, 14 + rng() * 10, (rng() - 0.5) * 4),
        spin: new THREE.Vector3((rng() - 0.5) * 14, (rng() - 0.5) * 14, (rng() - 0.5) * 14),
        rot: new THREE.Euler(rng() * 6, rng() * 6, rng() * 6),
        life: 7 + rng() * 4,
      });
      this.mesh.setColorAt(this.pieces.length - 1, tint.set(colours[n % colours.length]!));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let alive = 0;
    for (const [i, piece] of this.pieces.entries()) {
      piece.life -= dt;
      // Each piece keeps its slot, so it keeps its colour; a finished one just shrinks away.
      if (piece.life <= 0) {
        this.mesh.setMatrixAt(i, hidden);
        continue;
      }
      // Paper falls slowly once its launch is spent, drifting as it flutters.
      piece.v.y -= 14 * dt;
      piece.v.multiplyScalar(Math.pow(piece.v.y < 0 ? 0.1 : 0.5, dt));
      piece.v.y = Math.max(piece.v.y, -2);
      piece.p.addScaledVector(piece.v, dt);
      piece.p.x += Math.sin(piece.life * 3 + piece.spin.x) * dt * 0.6;
      piece.rot.x += piece.spin.x * dt;
      piece.rot.y += piece.spin.y * dt;
      piece.rot.z += piece.spin.z * dt;
      q.setFromEuler(piece.rot);
      m.compose(piece.p, q, s);
      this.mesh.setMatrixAt(i, m);
      alive++;
    }
    if (alive === 0) this.pieces.length = 0;
    this.mesh.count = this.pieces.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.pieces.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
