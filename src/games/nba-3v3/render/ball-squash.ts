import * as THREE from "three";
import type { Ball } from "../engine/types";

const UP = new THREE.Vector3(0, 1, 0);
const normal = new THREE.Vector3();

/** How much a ball flattens per metre a second into a surface: about 7 percent on a hard bounce, as a real one does. */
const PER_SPEED = 0.012;
const MOST = 0.09;
/** The rubber rings back once or twice and settles inside a few frames. */
const DECAY = 0.045;
const RING_HZ = 22;

/**
 * The squash of a hard bounce. A real ball flattens against the floor or
 * the iron for a few thousandths of a second and rings back; drawn, it
 * flattens along the surface normal for a frame or two and wobbles
 * once, keeping the side that hit on the surface.
 */
export class Squash {
  private amount = 0;
  private readonly n = new THREE.Vector3(0, 1, 0);

  update(ball: Ball, free: boolean): void {
    const hit = ball.impact;
    if (!free || hit.age > DECAY * 5) {
      this.amount = 0;
      return;
    }
    const s0 = Math.min(MOST, hit.power * PER_SPEED);
    this.amount = s0 * Math.exp(-hit.age / DECAY) * Math.cos(2 * Math.PI * RING_HZ * hit.age);
    this.n.set(hit.n.x, hit.n.y, hit.n.z).normalize();
  }

  /** Turns the group to the hit and stretches it: flat along the normal, wider across it. */
  apply(group: THREE.Object3D, radius: number): void {
    const s = this.amount;
    if (Math.abs(s) < 1e-4) {
      group.quaternion.identity();
      group.scale.set(1, 1, 1);
      return;
    }
    group.quaternion.setFromUnitVectors(UP, this.n);
    group.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
    // Flattened about its middle the ball would lift off what it hit, so it moves down onto it.
    group.position.addScaledVector(normal.copy(this.n), -s * radius);
  }
}
