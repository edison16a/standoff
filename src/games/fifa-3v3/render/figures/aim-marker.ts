import * as THREE from "three";

/**
 * The replay's target on the goal: a glowing ring with a dot in the
 * middle, standing in the goal mouth where the strike was aimed, so the
 * slow motion wind up shows where the ball is going before it goes.
 */
export class AimMarker {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshBasicMaterial({ color: "#fde047", transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  private readonly ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 40), this.material);
  private readonly dot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), this.material);

  constructor() {
    this.group.add(this.ring, this.dot);
    // The goal mouth faces along x, so the ring is turned to face down the pitch.
    this.group.rotation.y = Math.PI / 2;
    this.group.renderOrder = 4;
    this.group.visible = false;
  }

  /** Shows the marker at `at` on the goal, or hides it with null. */
  update(at: { x: number; y: number; z: number } | null, time: number): void {
    this.group.visible = at !== null;
    if (!at) return;
    // Just in front of the line, so the posts and the net never cut through it.
    this.group.position.set(at.x - Math.sign(at.x) * 0.08, at.y, at.z);
    const pulse = 1 + 0.12 * Math.sin(time * 7);
    this.ring.scale.setScalar(pulse);
    this.material.opacity = 0.75 + 0.2 * Math.sin(time * 7);
  }

  dispose(): void {
    this.ring.geometry.dispose();
    this.dot.geometry.dispose();
    this.material.dispose();
  }
}
