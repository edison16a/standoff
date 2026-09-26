import * as THREE from "three";

interface Tracer {
  from: THREE.Vector3;
  to: THREE.Vector3;
  born: number;
  length: number;
  speed: number;
  width: number;
}

interface Segment {
  mid: THREE.Vector3;
  turn: THREE.Quaternion;
  length: number;
  width: number;
}

const MAX = 96;
/** How many pixels wide a tracer stays however far away it is. */
const MIN_PIXELS = 2.2;
const up = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const head = new THREE.Vector3();
const tail = new THREE.Vector3();
const m = new THREE.Matrix4();
const s = new THREE.Vector3();

/**
 * Bullet tracers: glowing streaks that fly from the muzzle to wherever
 * the bullet stopped, fast enough to read as a shot and slow enough to
 * see. They are thin cylinders, widened for each view so a far one is
 * still a couple of pixels across. One instanced draw for all of them.
 */
export class Tracers {
  readonly mesh: THREE.InstancedMesh;
  private readonly live: Tracer[] = [];
  private readonly segments: Segment[] = [];
  private readonly geo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
  private readonly mat = new THREE.MeshBasicMaterial({ color: "#fff2b0", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

  constructor() {
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 6;
    for (let i = 0; i < MAX; i++) this.segments.push({ mid: new THREE.Vector3(), turn: new THREE.Quaternion(), length: 0, width: 0 });
  }

  /** A streak from `from` to `to`. Shotgun pellets are shorter and thinner. */
  add(from: THREE.Vector3, to: THREE.Vector3, now: number, pellet: boolean): void {
    if (this.live.length >= MAX) this.live.shift();
    this.live.push({ from: from.clone(), to: to.clone(), born: now, length: pellet ? 1.8 : 3.6, speed: pellet ? 180 : 220, width: pellet ? 0.01 : 0.016 });
  }

  /** Moves every streak along its path. */
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
      const length = head.distanceTo(tail);
      if (length < 1e-3) continue;
      const seg = this.segments[n++]!;
      seg.mid.copy(head).add(tail).multiplyScalar(0.5);
      seg.turn.setFromUnitVectors(up, dir);
      seg.length = length;
      seg.width = t.width;
    }
    this.mesh.count = n;
  }

  /** Sizes every streak for one view: at least a couple of pixels wide from where this camera is. */
  setView(camera: THREE.Vector3, fovDeg: number, heightPx: number): void {
    const perMetre = (2 * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, heightPx);
    for (let i = 0; i < this.mesh.count; i++) {
      const seg = this.segments[i]!;
      const width = Math.max(seg.width, seg.mid.distanceTo(camera) * perMetre * MIN_PIXELS * 0.5);
      s.set(width, seg.length, width);
      m.compose(seg.mid, seg.turn, s);
      this.mesh.setMatrixAt(i, m);
    }
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
