import * as THREE from "three";
import { FESTIVE } from "../player-colours";

const COUNT = 420;
const LIFE_MS = 7000;

interface Piece {
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  angle: THREE.Euler;
  born: number;
}

/**
 * Confetti for the winner, fired from cannons high on both sides of the
 * hall so it rains down over the strip. Every scrap is an instance of one
 * small quad that tumbles as it falls. It runs on the wall clock, so it
 * keeps falling at its own pace whatever the game is doing.
 */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private pieces: Piece[] = [];
  private lastT: number | null = null;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly one = new THREE.Vector3(1, 1, 1);

  constructor(private readonly random: () => number) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.11), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 }), COUNT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    const colour = new THREE.Color();
    for (let i = 0; i < COUNT; i++) this.mesh.setColorAt(i, colour.set(FESTIVE[i % FESTIVE.length]!));
  }

  /** Two cannons either side of `centre`, aiming up and in. */
  launch(centre: number, t: number): void {
    this.pieces = [];
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const p = new THREE.Vector3(centre + side * 6.5, 3.2, -2.5 + this.random() * 1.5);
      const v = new THREE.Vector3(-side * (2 + this.random() * 4.5), 5 + this.random() * 4, 1 + this.random() * 3.5);
      const spin = new THREE.Vector3(this.random() * 12 - 6, this.random() * 12 - 6, this.random() * 12 - 6);
      this.pieces.push({ p, v, spin, angle: new THREE.Euler(this.random() * 6, this.random() * 6, 0), born: t + this.random() * 500 });
    }
  }

  update(t: number): void {
    const dt = this.lastT === null ? 0 : Math.min(0.05, Math.max(0, t - this.lastT) / 1000);
    this.lastT = t;
    let count = 0;
    for (const piece of this.pieces) {
      if (t < piece.born || t - piece.born > LIFE_MS) continue;
      // Paper falls fast at first, then drifts: strong drag and a flutter.
      piece.v.y -= 9.8 * dt;
      piece.v.multiplyScalar(Math.exp(-dt * 2.2));
      piece.v.x += Math.sin(t / 300 + piece.spin.x) * dt * 0.6;
      piece.p.addScaledVector(piece.v, dt);
      if (piece.p.y < 0.14) piece.p.y = 0.14;
      else {
        piece.angle.x += piece.spin.x * dt;
        piece.angle.y += piece.spin.y * dt;
        piece.angle.z += piece.spin.z * dt;
      }
      this.q.setFromEuler(piece.angle);
      this.m.compose(piece.p, this.q, this.one);
      this.mesh.setMatrixAt(count++, this.m);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.pieces = [];
    this.mesh.count = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
