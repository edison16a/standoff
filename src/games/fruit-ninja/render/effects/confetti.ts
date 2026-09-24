import { Color, DoubleSide, DynamicDrawUsage, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, PlaneGeometry, Quaternion, Vector3 } from "three";
import { HALF_HEIGHT } from "../../engine/tuning";

interface Piece {
  p: Vector3;
  v: Vector3;
  spin: Euler;
  rate: Vector3;
  phase: number;
}

const COUNT = 420;
const matrix = new Matrix4();
const q = new Quaternion();
const size = new Vector3(0.16, 0.26, 1);

/**
 * Paper confetti for the winner, tumbling and fluttering down in front of
 * everything. Coloured in the players' colours and gold.
 */
export class Confetti {
  readonly mesh: InstancedMesh;
  private pieces: Piece[] = [];

  constructor() {
    this.mesh = new InstancedMesh(new PlaneGeometry(1, 1), new MeshStandardMaterial({ side: DoubleSide, roughness: 0.5, metalness: 0.2 }), COUNT);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 30;
    this.mesh.setColorAt(0, new Color());
  }

  /** Throws a fresh batch from above the screen in the given colours. */
  launch(halfWidth: number, colors: string[]): void {
    this.pieces = [];
    const palette = colors.map((c) => new Color(c));
    for (let i = 0; i < COUNT; i++) {
      this.pieces.push({
        p: new Vector3((Math.random() * 2 - 1) * halfWidth, HALF_HEIGHT + 0.5 + Math.random() * 6, 1 + Math.random() * 3),
        v: new Vector3((Math.random() - 0.5) * 1.5, -1.2 - Math.random() * 1.8, 0),
        spin: new Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        rate: new Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 4 - 2),
        phase: Math.random() * 6,
      });
      this.mesh.setColorAt(i, palette[i % palette.length]!);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = COUNT;
  }

  stop(): void {
    this.pieces = [];
    this.mesh.count = 0;
  }

  update(dt: number, time: number): void {
    if (this.pieces.length === 0) return;
    this.pieces.forEach((piece, i) => {
      // A sideways flutter, like paper sliding on the air.
      piece.p.x += (piece.v.x + Math.sin(time * 3 + piece.phase) * 0.8) * dt;
      piece.p.y += piece.v.y * dt;
      if (piece.p.y < -HALF_HEIGHT - 1) piece.p.y += HALF_HEIGHT * 2 + 2;
      piece.spin.x += piece.rate.x * dt;
      piece.spin.y += piece.rate.y * dt;
      piece.spin.z += piece.rate.z * dt;
      matrix.compose(piece.p, q.setFromEuler(piece.spin), size);
      this.mesh.setMatrixAt(i, matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
