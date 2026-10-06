import * as THREE from "three";

interface Shard {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Tumble axis and rate. */
  ax: number;
  ay: number;
  az: number;
  spin: number;
  angle: number;
  age: number;
  life: number;
  size: number;
  /** Road height to skip off, or -Infinity over a gap. */
  floor: number;
  color: THREE.Color;
}

const GRAVITY = 16;
const BOUNCE = 0.35;
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const axis = new THREE.Vector3();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();

/**
 * Glass shards from a broken item box: thin tinted slivers flung out of
 * the burst, tumbling, skipping once or twice off the road and shrinking
 * away. A fixed pool, one instanced mesh, reused in turn.
 */
export class BoxShards {
  readonly mesh: THREE.InstancedMesh;
  private readonly shards: Shard[] = [];
  private next = 0;
  private readonly material: THREE.MeshStandardMaterial;

  constructor(private readonly max = 240) {
    // A thin flat sliver, longer than it is wide, that flashes as its faces turn to the light.
    const outline = new THREE.Shape([new THREE.Vector2(0, 0.2), new THREE.Vector2(-0.07, -0.09), new THREE.Vector2(0.02, -0.13), new THREE.Vector2(0.08, -0.04)]);
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.02, bevelEnabled: false }).center();
    this.material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.03, metalness: 0.15, transparent: true, opacity: 0.5, emissive: "#ffffff", emissiveIntensity: 0.08, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geometry, this.material, max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < max; i++) {
      this.shards.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 1, az: 0, spin: 0, angle: 0, age: 1, life: 0, size: 0, floor: 0, color: new THREE.Color("#ffffff") });
      this.mesh.setColorAt(i, c.set("#ffffff"));
    }
  }

  setEnvironment(environment: THREE.Texture | null): void {
    this.material.envMap = environment;
    this.material.needsUpdate = true;
  }

  /**
   * Bursts `count` shards out of a box centred at x, y, z. They carry
   * some of the pace of the kart that smashed it (`carryX`, `carryZ`), so
   * they fly on ahead with it rather than vanish behind its camera.
   */
  burst(x: number, y: number, z: number, floor: number, tint: string, count: number, carryX = 0, carryZ = 0): void {
    for (let n = 0; n < count; n++) {
      const shard = this.shards[this.next]!;
      this.next = (this.next + 1) % this.max;
      const theta = Math.random() * Math.PI * 2;
      const out = 3 + Math.random() * 6;
      axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      Object.assign(shard, {
        x: x + Math.cos(theta) * 0.5,
        y: y + (Math.random() - 0.5) * 0.9,
        z: z + Math.sin(theta) * 0.5,
        vx: Math.cos(theta) * out + carryX * (0.45 + Math.random() * 0.4),
        vy: 2 + Math.random() * 6,
        vz: Math.sin(theta) * out + carryZ * (0.45 + Math.random() * 0.4),
        ax: axis.x,
        ay: axis.y,
        az: axis.z,
        spin: 6 + Math.random() * 14,
        angle: Math.random() * 6,
        age: 0,
        life: 0.8 + Math.random() * 0.6,
        size: 0.35 + Math.random() * 0.5,
        floor,
      });
      // Most shards are clear glass catching the light; some carry the box's colour.
      shard.color.set(Math.random() < 0.45 ? tint : "#e8f4ff");
    }
  }

  update(dt: number): void {
    let shown = 0;
    for (const shard of this.shards) {
      if (shard.age >= shard.life) continue;
      shard.age += dt;
      shard.vy -= GRAVITY * dt;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.z += shard.vz * dt;
      shard.angle += shard.spin * dt;
      if (shard.y < shard.floor + 0.03 && shard.vy < 0) {
        // Skips off the road, losing most of its pace each time.
        shard.y = shard.floor + 0.03;
        shard.vy *= -BOUNCE;
        shard.vx *= 0.6;
        shard.vz *= 0.6;
        shard.spin *= 0.5;
      }
      const left = 1 - shard.age / shard.life;
      const scale = shard.size * Math.min(1, left * 3.5);
      q.setFromAxisAngle(axis.set(shard.ax, shard.ay, shard.az), shard.angle);
      m.compose(p.set(shard.x, shard.y, shard.z), q, s.setScalar(Math.max(0, scale)));
      // Only live shards are drawn, packed to the front of the buffer.
      this.mesh.setMatrixAt(shown, m);
      this.mesh.setColorAt(shown, shard.color);
      shown++;
    }
    this.mesh.count = shown;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (shown > 0) this.mesh.instanceColor!.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
