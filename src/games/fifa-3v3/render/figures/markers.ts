import * as THREE from "three";
import type { AthleteView } from "../../engine/view";

/**
 * A glowing ring on the turf under each phone's player, in their colour,
 * with a notch showing which way they face. It brightens and pulses
 * while they have the ball, so everyone can find themselves at a glance.
 */
export class Marker {
  readonly group = new THREE.Group();
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly notch: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

  constructor(colour: string) {
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.58, 40),
      new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    const tri = new THREE.Shape();
    tri.moveTo(0, 0.78);
    tri.lineTo(-0.14, 0.6);
    tri.lineTo(0.14, 0.6);
    tri.closePath();
    this.notch = new THREE.Mesh(new THREE.ShapeGeometry(tri), this.ring.material);
    this.notch.rotation.x = -Math.PI / 2;
    const facing = new THREE.Group();
    facing.add(this.notch);
    this.group.add(this.ring, facing);
    this.group.renderOrder = 3;
  }

  update(a: AthleteView, time: number): void {
    this.group.position.set(a.x, 0.02, a.z);
    // Laid flat, the notch points to -z; turning by -facing - 90 degrees points it the player's way.
    this.notch.parent!.rotation.y = -a.facing - Math.PI / 2;
    const pulse = a.hasBall ? 1 + 0.12 * Math.sin(time * 10) : 1;
    this.ring.scale.setScalar(pulse);
    this.ring.material.opacity = a.hasBall ? 1 : 0.7;
  }

  dispose(): void {
    this.ring.geometry.dispose();
    this.notch.geometry.dispose();
    this.ring.material.dispose();
  }
}
