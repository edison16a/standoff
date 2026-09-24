import * as THREE from "three";

const MAX = 700;

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

/**
 * Paper confetti for the winners: fired up from cannons at the corners
 * of the court and fluttering down over the floor, each piece tumbling
 * as it falls. One instanced mesh, one draw.
 */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private readonly pieces: Piece[] = [];

  constructor() {
    const geo = new THREE.PlaneGeometry(0.06, 0.1);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, new THREE.Color("#ffffff"));
  }

  /** Blasts `count` pieces in the given colours from a point, up and outward. */
  fire(x: number, z: number, colours: readonly string[], count = 160, rng: () => number = Math.random): void {
    for (let n = 0; n < count && this.pieces.length < MAX; n++) {
      const a = rng() * Math.PI * 2;
      const out = 1.5 + rng() * 4;
      this.pieces.push({
        p: new THREE.Vector3(x, 0.8, z),
        v: new THREE.Vector3(Math.cos(a) * out - x * 0.25, 9 + rng() * 7, Math.sin(a) * out - (z - 5) * 0.25),
        spin: new THREE.Vector3((rng() - 0.5) * 14, (rng() - 0.5) * 14, (rng() - 0.5) * 14),
        rot: new THREE.Euler(rng() * 6, rng() * 6, rng() * 6),
        life: 9 + rng() * 4,
      });
      this.mesh.setColorAt(this.pieces.length - 1, new THREE.Color(colours[n % colours.length]!));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let alive = 0;
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const [i, piece] of this.pieces.entries()) {
      piece.life -= dt;
      // Each piece keeps its slot, so it keeps its colour; a finished one just shrinks away.
      if (piece.life <= 0) {
        this.mesh.setMatrixAt(i, hidden);
        continue;
      }
      // Paper falls slowly once its launch is spent, drifting as it flutters.
      piece.v.y -= 9.8 * dt;
      const drag = Math.pow(piece.v.y < 0 ? 0.08 : 0.5, dt);
      piece.v.multiplyScalar(drag);
      piece.v.y = Math.max(piece.v.y, -1.1);
      piece.p.addScaledVector(piece.v, dt);
      piece.p.x += Math.sin(piece.life * 3 + piece.spin.x) * dt * 0.4;
      if (piece.p.y < 0.01) {
        piece.p.y = 0.01;
        piece.v.set(0, 0, 0);
      } else {
        piece.rot.x += piece.spin.x * dt;
        piece.rot.y += piece.spin.y * dt;
        piece.rot.z += piece.spin.z * dt;
      }
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
