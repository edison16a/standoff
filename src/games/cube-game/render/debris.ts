import * as THREE from "three";
import type { Skin } from "./avatar";

const CAPACITY = 64;
const PER_CRASH = 14;

interface Shard {
  at: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  turn: THREE.Euler;
  life: number;
  size: number;
  colour: THREE.Color;
}

/**
 * The shards a crashing cube breaks into: small glowing boxes in the
 * player's colours that fly, spin, fall and shrink away, all in one
 * instanced draw.
 */
export class Debris {
  readonly mesh: THREE.InstancedMesh;
  private readonly shards: Shard[] = [];
  // Reused every frame, so drawing the shards makes no garbage.
  private readonly matrix = new THREE.Matrix4();
  private readonly turn = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();

  constructor() {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.4 });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, CAPACITY);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  /** Breaks a cube at a point. `random` is the effects' own, so a filmed showcase repeats exactly. */
  crash(x: number, y: number, skin: Skin, random: () => number): void {
    for (let i = 0; i < PER_CRASH; i++) {
      if (this.shards.length >= CAPACITY) this.shards.shift();
      const angle = random() * Math.PI * 2;
      const v = 5 + random() * 9;
      this.shards.push({
        at: new THREE.Vector3(x + (random() - 0.5) * 0.6, y + (random() - 0.5) * 0.6, (random() - 0.5) * 0.6),
        velocity: new THREE.Vector3(Math.cos(angle) * v, Math.sin(angle) * v + 4, (random() - 0.5) * 6),
        spin: new THREE.Vector3(random() * 12, random() * 12, random() * 12),
        turn: new THREE.Euler(),
        life: 0.9 + random() * 0.5,
        size: 0.14 + random() * 0.2,
        colour: new THREE.Color(i % 3 === 0 ? skin.trim : skin.main),
      });
    }
  }

  update(dt: number): void {
    const { matrix, turn: q, scale } = this;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i]!;
      shard.life -= dt;
      if (shard.life <= 0) {
        this.shards.splice(i, 1);
        continue;
      }
      shard.velocity.y -= 30 * dt;
      shard.at.addScaledVector(shard.velocity, dt);
      shard.turn.set(shard.turn.x + shard.spin.x * dt, shard.turn.y + shard.spin.y * dt, shard.turn.z + shard.spin.z * dt);
    }
    this.shards.forEach((shard, i) => {
      this.mesh.setMatrixAt(i, matrix.compose(shard.at, q.setFromEuler(shard.turn), scale.setScalar(shard.size * Math.min(1, shard.life * 2))));
      this.mesh.setColorAt(i, shard.colour);
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = this.shards.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.shards.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
