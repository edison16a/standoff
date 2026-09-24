import { Color, DynamicDrawUsage, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, TetrahedronGeometry, Vector3 } from "three";
import { GRAVITY } from "../../engine/tuning";

interface Shard {
  p: Vector3;
  v: Vector3;
  spin: Vector3;
  q: Quaternion;
  size: number;
  age: number;
}

const CAPACITY = 160;
const matrix = new Matrix4();
const scale = new Vector3();
const turn = new Quaternion();

/** Black shell shards a bomb throws out, tumbling as they fall. One instanced mesh for all of them. */
export class Shards {
  readonly mesh: InstancedMesh;
  private readonly live: Shard[] = [];

  constructor() {
    this.mesh = new InstancedMesh(new TetrahedronGeometry(1), new MeshStandardMaterial({ color: new Color("#1a1a1c"), roughness: 0.35, metalness: 0.6 }), CAPACITY);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
  }

  throw(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.live.length >= CAPACITY) this.live.shift();
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
    let n = 0;
    for (const s of this.live) {
      s.age += dt;
      if (s.age > 2.5) continue;
      s.v.y -= GRAVITY * dt;
      s.p.addScaledVector(s.v, dt);
      turn.setFromAxisAngle(scale.copy(s.spin).normalize(), s.spin.length() * dt);
      s.q.multiply(turn);
      matrix.compose(s.p, s.q, scale.setScalar(s.size));
      this.mesh.setMatrixAt(n, matrix);
      this.live[n++] = s;
    }
    this.live.length = n;
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.live.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshStandardMaterial).dispose();
    this.mesh.dispose();
  }
}
