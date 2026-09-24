import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  RingGeometry,
  TetrahedronGeometry,
  Vector3,
  type Scene,
} from "three";
import { GRAVITY } from "../../engine/tuning";
import type { Particles } from "./particles";

interface Shard {
  p: Vector3;
  v: Vector3;
  spin: Vector3;
  q: Quaternion;
  size: number;
  age: number;
}

const SHARDS = 160;
const FIRE = ["#fff4c2", "#ffd24a", "#ff8a1a", "#ff4a0a", "#d8200a"];
const matrix = new Matrix4();
const scale = new Vector3();
const turn = new Quaternion();

/**
 * A bomb going off: a white flash that lights the whole board, a fireball
 * of glowing puffs, sparks, black shell shards that bounce off the board,
 * a shockwave ring and a column of smoke.
 */
export class Explosions {
  private readonly light = new PointLight(0xffb060, 0, 30, 1.6);
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly shards: InstancedMesh;
  private readonly live: Shard[] = [];
  private ringAge = 99;
  private lightAge = 99;

  constructor(
    scene: Scene,
    private readonly fire: Particles,
    private readonly smoke: Particles,
    private readonly sparks: Particles,
  ) {
    this.light.position.z = 2;
    scene.add(this.light);
    this.ringMaterial = new MeshBasicMaterial({ color: new Color("#ffd08a"), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    this.ring = new Mesh(new RingGeometry(0.8, 1, 64), this.ringMaterial);
    this.ring.renderOrder = 15;
    scene.add(this.ring);
    this.shards = new InstancedMesh(new TetrahedronGeometry(1), new MeshStandardMaterial({ color: new Color("#1a1a1c"), roughness: 0.4, metalness: 0.5 }), SHARDS);
    this.shards.instanceMatrix.setUsage(DynamicDrawUsage);
    this.shards.count = 0;
    this.shards.castShadow = true;
    this.shards.frustumCulled = false;
    scene.add(this.shards);
  }

  blast(x: number, y: number): void {
    this.light.position.set(x, y, 2);
    this.lightAge = 0;
    this.ring.position.set(x, y, 0.2);
    this.ringAge = 0;
    this.fire.emit({ x, y, z: 1, vx: 0, vy: 0, life: 0.25, size: 9, color: "#ffffff", grow: 1.4 });
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      this.fire.emit({
        x,
        y,
        z: Math.random(),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        vz: Math.random() * 2,
        life: 0.35 + Math.random() * 0.6,
        size: 0.9 + Math.random() * 1.6,
        grow: 1.8,
        drag: 3.5,
        gravity: -1.5,
        color: FIRE[Math.floor(Math.random() * FIRE.length)]!,
      });
    }
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 12;
      this.sparks.emit({ x, y, z: 0.5, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.4 + Math.random() * 0.5, size: 0.35, grow: 0.3, drag: 2, gravity: 6, color: "#ffcf6a" });
    }
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      this.smoke.emit({
        x: x + Math.cos(a) * 0.3,
        y: y + Math.sin(a) * 0.3,
        z: 0.3,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed + 0.8,
        life: 1.6 + Math.random() * 1.4,
        size: 1.4 + Math.random() * 1.4,
        grow: 2.6,
        drag: 1.4,
        gravity: -0.6,
        alpha: 0.75,
        color: Math.random() < 0.5 ? "#2a2522" : "#4a403a",
      });
    }
    for (let i = 0; i < 26; i++) {
      if (this.live.length >= SHARDS) this.live.shift();
      const a = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.live.push({
        p: new Vector3(x, y, 0),
        v: new Vector3(Math.cos(a) * speed, Math.sin(a) * speed + 3, Math.random() * 3),
        spin: new Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        q: new Quaternion(),
        size: 0.05 + Math.random() * 0.12,
        age: 0,
      });
    }
  }

  update(dt: number): void {
    this.lightAge += dt;
    this.light.intensity = this.lightAge < 0.6 ? 900 * Math.exp(-this.lightAge * 8) : 0;
    this.ringAge += dt;
    const k = Math.min(1, this.ringAge / 0.45);
    this.ring.scale.setScalar(0.5 + k * 5);
    this.ringMaterial.opacity = this.ringAge < 0.45 ? (1 - k) * 0.9 : 0;

    let n = 0;
    for (const s of this.live) {
      s.age += dt;
      if (s.age > 2.5) continue;
      s.v.y -= GRAVITY * dt;
      s.p.addScaledVector(s.v, dt);
      turn.setFromAxisAngle(scale.copy(s.spin).normalize(), s.spin.length() * dt);
      s.q.multiply(turn);
      matrix.compose(s.p, s.q, scale.setScalar(s.size));
      this.shards.setMatrixAt(n, matrix);
      this.live[n++] = s;
    }
    this.live.length = n;
    this.shards.count = n;
    this.shards.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.live.length = 0;
    this.ringAge = this.lightAge = 99;
  }
}
