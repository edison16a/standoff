import { Quaternion, Vector3, type Object3D, type Scene } from "three";
import { GRAVITY, HALF_HEIGHT } from "../engine/tuning";

interface Piece {
  obj: Object3D;
  v: Vector3;
  spin: Vector3;
  age: number;
}

const MAX = 90;
const turn = new Quaternion();
const axis = new Vector3();
const UP = new Vector3(0, 1, 0);
/** How far the cut face tips toward the camera, so a cut fruit shows its flesh like the cover's watermelon. */
const FACE_TILT = 0.75;

/**
 * Cut fruit halves falling away. They keep the fruit's speed, spring
 * apart across the blade's path and tumble slowly, so the flesh stays in
 * view as they drop off the screen.
 */
export class Pieces {
  private readonly list: Piece[] = [];

  constructor(private readonly scene: Scene) {}

  /**
   * Splits a fruit. `halves` are its two half models in the fruit's own
   * frame (half a away along +y, half b along -y), `from` its turn when
   * cut and `dir` the blade's direction on screen.
   */
  split(halves: [Object3D, Object3D], at: Vector3, from: Quaternion, scale: number, velocity: { x: number; y: number }, dir: { x: number; y: number }): void {
    // The cut plane holds the blade's path. Its normal points across the path.
    const across = new Vector3(-dir.y, dir.x, 0);
    const current = UP.clone().applyQuaternion(from);
    halves.forEach((half, i) => {
      const side = i === 0 ? 1 : -1;
      // Each half swings open like a book, its cut face tipped toward the camera, so both show their
      // flesh. Half a's face looks along its own -y and half b's along +y, so they tip opposite ways.
      const normal = across
        .clone()
        .multiplyScalar(Math.cos(FACE_TILT))
        .add(new Vector3(0, 0, -side * Math.sin(FACE_TILT)))
        .normalize();
      // Turn the fruit as little as possible so its own +y lines up with that normal.
      const orient = new Quaternion().setFromUnitVectors(current, normal).multiply(from);
      half.position.copy(at);
      half.quaternion.copy(orient);
      half.scale.setScalar(scale);
      this.scene.add(half);
      const push = 1.6 + Math.random() * 0.8;
      this.list.push({
        obj: half,
        v: new Vector3(velocity.x * 0.6 + across.x * push * side + dir.x * 0.8, velocity.y * 0.4 + across.y * push * side + dir.y * 0.8 + 1, 0),
        spin: new Vector3(dir.x, dir.y, 0).multiplyScalar(side * (1 + Math.random())).add(new Vector3(0, 0, (Math.random() - 0.5) * 2)),
        age: 0,
      });
    });
    while (this.list.length > MAX) this.drop(0);
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const piece = this.list[i]!;
      piece.age += dt;
      piece.v.y -= GRAVITY * dt;
      piece.obj.position.addScaledVector(piece.v, dt);
      const rate = piece.spin.length();
      if (rate > 0) piece.obj.quaternion.premultiply(turn.setFromAxisAngle(axis.copy(piece.spin).normalize(), rate * dt));
      if (piece.obj.position.y < -HALF_HEIGHT - 3 || piece.age > 6) this.drop(i);
    }
  }

  clear(): void {
    while (this.list.length) this.drop(0);
  }

  private drop(index: number): void {
    const [piece] = this.list.splice(index, 1);
    if (piece) this.scene.remove(piece.obj);
  }
}
