import * as THREE from "three";

const MAX = 240;
const GRAVITY = -7;

interface Chip {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  rotation: THREE.Euler;
  start: number;
  life: number;
  size: number;
}

/**
 * Little flecks that burst off whatever a BB strikes: yellow rubber off a
 * duck, paint off a bullseye, sparks off a steel plate. All of them are
 * one instanced mesh, so a busy round costs a single draw call.
 */
export class Chips {
  readonly object: THREE.InstancedMesh;
  private readonly chips: (Chip | null)[] = Array.from({ length: MAX }, () => null);
  private next = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor() {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
    this.object = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MAX);
    this.object.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      this.object.setMatrixAt(i, this.hidden);
      this.object.setColorAt(i, new THREE.Color("#ffffff"));
    }
  }

  burst(at: THREE.Vector3, colours: readonly string[], count: number, now: number, speed = 1.6): void {
    const colour = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      // Mostly back toward the players and upward, the way flecks fly off a struck face.
      const velocity = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.3, Math.random() * 1.2 + 0.2).multiplyScalar(speed);
      this.chips[i] = {
        position: at.clone(),
        velocity,
        spin: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10),
        rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        start: now,
        life: 0.5 + Math.random() * 0.5,
        size: 0.015 + Math.random() * 0.025,
      };
      this.object.setColorAt(i, colour.set(colours[n % colours.length]!));
    }
    if (this.object.instanceColor) this.object.instanceColor.needsUpdate = true;
  }

  update(now: number, dt: number): void {
    let changed = false;
    this.chips.forEach((chip, i) => {
      if (!chip) return;
      changed = true;
      const t = (now - chip.start) / chip.life;
      if (t >= 1) {
        this.chips[i] = null;
        this.object.setMatrixAt(i, this.hidden);
        return;
      }
      chip.velocity.y += GRAVITY * dt;
      chip.position.addScaledVector(chip.velocity, dt);
      chip.rotation.x += chip.spin.x * dt;
      chip.rotation.y += chip.spin.y * dt;
      chip.rotation.z += chip.spin.z * dt;
      this.quaternion.setFromEuler(chip.rotation);
      this.scale.setScalar(chip.size * (1 - t * t));
      this.matrix.compose(chip.position, this.quaternion, this.scale);
      this.object.setMatrixAt(i, this.matrix);
    });
    if (changed) this.object.instanceMatrix.needsUpdate = true;
  }
}
