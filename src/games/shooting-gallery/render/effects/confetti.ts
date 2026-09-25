import * as THREE from "three";

const COUNT = 320;
const PALETTE = ["#ff4757", "#2ed573", "#3a86ff", "#ffb400", "#ffffff", "#ff6fae", "#ffd21f"];

interface Piece {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  spin: THREE.Vector3;
  flutter: number;
}

/**
 * A shower of paper confetti over the booth for the winner. Every piece
 * tumbles and flutters on its own but all are one instanced mesh.
 */
export class Confetti {
  readonly object: THREE.InstancedMesh;
  private readonly pieces: Piece[] = [];
  private startedAt = -Infinity;
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly size = new THREE.Vector3(0.05, 0.08, 1);

  constructor(private readonly random: () => number = Math.random) {
    this.object = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }),
      COUNT,
    );
    this.object.frustumCulled = false;
    this.object.visible = false;
    const colour = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      this.object.setColorAt(i, colour.set(PALETTE[i % PALETTE.length]!));
      this.pieces.push({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), rotation: new THREE.Euler(), spin: new THREE.Vector3(), flutter: 0 });
    }
  }

  /** Throws the confetti, tinted toward the winners' colours when there are any. */
  start(now: number, colours: readonly string[]): void {
    this.startedAt = now;
    this.object.visible = true;
    const palette = colours.length ? [...colours, ...colours, "#ffffff", "#ffd21f"] : PALETTE;
    const colour = new THREE.Color();
    this.pieces.forEach((piece, i) => {
      piece.position.set((this.random() - 0.5) * 9, 4.2 + this.random() * 2.5, -1.5 + this.random() * 4);
      piece.velocity.set((this.random() - 0.5) * 0.8, -0.6 - this.random() * 0.8, (this.random() - 0.5) * 0.4);
      piece.rotation.set(this.random() * 6, this.random() * 6, this.random() * 6);
      piece.spin.set(this.random() * 8 - 4, this.random() * 8 - 4, this.random() * 8 - 4);
      piece.flutter = this.random() * Math.PI * 2;
      this.object.setColorAt(i, colour.set(palette[i % palette.length]!));
    });
    if (this.object.instanceColor) this.object.instanceColor.needsUpdate = true;
  }

  stop(): void {
    this.object.visible = false;
    this.startedAt = -Infinity;
  }

  update(now: number, dt: number): void {
    if (!this.object.visible) return;
    const elapsed = now - this.startedAt;
    this.pieces.forEach((piece, i) => {
      // Paper falls at a steady drift, swaying side to side as it goes.
      piece.position.x += (piece.velocity.x + Math.sin(elapsed * 3 + piece.flutter) * 0.35) * dt;
      piece.position.y += piece.velocity.y * dt;
      piece.position.z += piece.velocity.z * dt;
      // Pieces that reach the floor are thrown again from the top for a few seconds.
      if (piece.position.y < -0.5 && elapsed < 6) piece.position.y += 6;
      piece.rotation.x += piece.spin.x * dt;
      piece.rotation.y += piece.spin.y * dt;
      piece.rotation.z += piece.spin.z * dt;
      this.quaternion.setFromEuler(piece.rotation);
      this.matrix.compose(piece.position, this.quaternion, this.size);
      this.object.setMatrixAt(i, this.matrix);
    });
    this.object.instanceMatrix.needsUpdate = true;
    if (elapsed > 14) this.stop();
  }
}
