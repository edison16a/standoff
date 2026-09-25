import * as THREE from "three";
import type { PlayerEvent, PlayerState } from "../engine/player";
import type { Skin } from "./avatar";
import { Particles } from "./particles";
import { MODE_COLOURS } from "./themes";

const DEBRIS = 64;

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
 * The sparks: each player's trail, bursts at pads, orbs and portals, a
 * puff on landing, and the crash, which throws cube shards and a ring of
 * light. All of it lives in the world, so both halves of a split screen
 * see a rival's crash if it is in view.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly particles = new Particles();
  private readonly shards: Shard[] = [];
  private readonly debris: THREE.InstancedMesh;
  private readonly rings: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly ringGeometry = new THREE.RingGeometry(0.8, 1, 48);
  private readonly colour = new THREE.Color();
  private seed = 1;

  constructor() {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.4 });
    this.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, DEBRIS);
    this.debris.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBRIS * 3), 3);
    this.debris.count = 0;
    this.debris.frustumCulled = false;
    this.group.add(this.particles.points, this.debris);
  }

  /** Repeatable randomness, so the showcase plays the same on every capture. */
  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  trail(state: PlayerState, skin: Skin, dt: number): void {
    if (state.dead || state.finished) return;
    const count = Math.min(3, Math.ceil(dt * 90));
    for (let i = 0; i < count; i++) {
      const behind = state.mode === "ufo" ? -0.2 : 0.46 * state.gravity;
      this.particles.spawn({
        x: state.x - 0.45,
        y: state.y - behind * (state.mode === "ufo" ? 1 : 0.8) + (this.random() - 0.5) * 0.3,
        vx: -1 - this.random() * 2,
        vy: (this.random() - 0.5) * 1.2,
        life: 0.35 + this.random() * 0.25,
        size: 0.22 + this.random() * 0.14,
        colour: this.colour.set(i % 2 ? skin.trim : skin.main),
        drag: 1.5,
      });
    }
  }

  /** Sparks for whatever just happened. */
  event(event: PlayerEvent, state: PlayerState, skin: Skin): void {
    switch (event.type) {
      case "death":
        this.explode(event.x, event.y, skin);
        break;
      case "land":
        this.burst(state.x, state.y - 0.46 * state.gravity, 0xffffff, 6, 3, 0.25);
        break;
      case "pad":
        this.burst(event.x + 0.5, event.y, 0xffe14d, 16, 7, 0.4);
        break;
      case "orb":
        this.burst(event.x, event.y, 0xffd21f, 22, 8, 0.45);
        this.ring(event.x, event.y, 0xffd21f);
        break;
      case "portal":
        this.burst(state.x, state.y, MODE_COLOURS[event.mode], 40, 10, 0.6);
        this.ring(state.x, state.y, MODE_COLOURS[event.mode]);
        break;
      case "finish":
        for (let i = 0; i < 5; i++) this.burst(state.x + 2 + i, 2 + this.random() * 6, [0xff4fd8, 0x3ee6ff, 0xffe14d, 0x3dff6e, 0xff8a3d][i]!, 30, 9, 1.1);
        break;
      default:
    }
  }

  private burst(x: number, y: number, hex: number, count: number, speed: number, life: number): void {
    this.colour.set(hex);
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const v = speed * (0.4 + this.random() * 0.6);
      this.particles.spawn({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, vz: (this.random() - 0.5) * v, life: life * (0.6 + this.random() * 0.6), size: 0.3, colour: this.colour, drag: 2.5 });
    }
  }

  private ring(x: number, y: number, hex: number): void {
    const mesh = new THREE.Mesh(this.ringGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.position.set(x, y, 0.2);
    this.group.add(mesh);
    this.rings.push({ mesh, life: 0.45 });
  }

  private explode(x: number, y: number, skin: Skin): void {
    this.burst(x, y, skin.trim, 50, 14, 0.7);
    this.burst(x, y, 0xffffff, 20, 9, 0.35);
    this.ring(x, y, skin.trim);
    for (let i = 0; i < 14; i++) {
      if (this.shards.length >= DEBRIS) this.shards.shift();
      const angle = this.random() * Math.PI * 2;
      const v = 5 + this.random() * 9;
      this.shards.push({
        at: new THREE.Vector3(x + (this.random() - 0.5) * 0.6, y + (this.random() - 0.5) * 0.6, (this.random() - 0.5) * 0.6),
        velocity: new THREE.Vector3(Math.cos(angle) * v, Math.sin(angle) * v + 4, (this.random() - 0.5) * 6),
        spin: new THREE.Vector3(this.random() * 12, this.random() * 12, this.random() * 12),
        turn: new THREE.Euler(),
        life: 0.9 + this.random() * 0.5,
        size: 0.14 + this.random() * 0.2,
        colour: new THREE.Color(i % 3 === 0 ? skin.trim : skin.main),
      });
    }
  }

  update(dt: number): void {
    this.particles.update(dt);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
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
      this.debris.setMatrixAt(i, matrix.compose(shard.at, q.setFromEuler(shard.turn), scale.setScalar(shard.size * Math.min(1, shard.life * 2))));
      this.debris.setColorAt(i, shard.colour);
    });
    if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
    this.debris.count = this.shards.length;
    this.debris.instanceMatrix.needsUpdate = true;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      ring.life -= dt;
      const material = ring.mesh.material as THREE.MeshBasicMaterial;
      if (ring.life <= 0) {
        this.group.remove(ring.mesh);
        material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      ring.mesh.scale.setScalar(0.5 + (0.45 - ring.life) * 7);
      material.opacity = ring.life / 0.45;
    }
  }

  clear(): void {
    this.particles.clear();
    this.shards.length = 0;
  }

  dispose(): void {
    this.particles.dispose();
    this.debris.geometry.dispose();
    (this.debris.material as THREE.Material).dispose();
    this.ringGeometry.dispose();
    for (const ring of this.rings) (ring.mesh.material as THREE.Material).dispose();
  }
}
