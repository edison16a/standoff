import * as THREE from "three";

interface Tracer {
  from: THREE.Vector3;
  to: THREE.Vector3;
  born: number;
  length: number;
  speed: number;
  width: number;
}

const MAX = 96;
const up = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const head = new THREE.Vector3();
const tail = new THREE.Vector3();
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();

/**
 * Bullet tracers: glowing streaks that fly from the muzzle to wherever
 * the bullet stopped, fast enough to read as a shot and slow enough to
 * see. They are thin cylinders, so they look right from every view at
 * once. One instanced draw for all of them.
 */
export class Tracers {
  readonly mesh: THREE.InstancedMesh;
  private readonly live: Tracer[] = [];
  private readonly geo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
  private readonly mat = new THREE.MeshBasicMaterial({ color: "#fff2b0", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

  constructor() {
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 6;
  }

  /** A streak from `from` to `to`. Shotgun pellets are shorter and thinner. */
  add(from: THREE.Vector3, to: THREE.Vector3, now: number, pellet: boolean): void {
    if (this.live.length >= MAX) this.live.shift();
    this.live.push({ from: from.clone(), to: to.clone(), born: now, length: pellet ? 1.6 : 3.2, speed: pellet ? 260 : 320, width: pellet ? 0.008 : 0.012 });
  }

  update(now: number): void {
    let n = 0;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const t = this.live[i]!;
      const total = t.from.distanceTo(t.to);
      const travelled = (now - t.born) * t.speed;
      if (travelled - t.length > total) {
        this.live.splice(i, 1);
        continue;
      }
      dir.subVectors(t.to, t.from).normalize();
      head.copy(t.from).addScaledVector(dir, Math.min(total, travelled));
      tail.copy(t.from).addScaledVector(dir, Math.max(0, Math.min(total, travelled - t.length)));
      const len = head.distanceTo(tail);
      if (len < 1e-3) continue;
      q.setFromUnitVectors(up, dir);
      s.set(t.width, len, t.width);
      m.compose(head.add(tail).multiplyScalar(0.5), q, s);
      this.mesh.setMatrixAt(n++, m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.live.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
