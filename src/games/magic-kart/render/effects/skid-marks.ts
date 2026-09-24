import * as THREE from "three";

/** Strips kept at once, across every kart. The oldest is reused when they run out. */
const MAX = 1200;
/** Seconds a mark takes to fade away. */
const LIFE = 7;
const WIDTH = 0.32;
const DARKNESS = 0.42;
/** A new strip is laid once a wheel has moved this far, in metres. */
const STEP = 0.45;

/**
 * Dark rubber on the road behind sliding wheels. One mesh holds every
 * strip in a ring, so marks cost one draw call however many karts slide,
 * and each strip fades by its age through the vertex alpha.
 */
export class SkidMarks {
  readonly mesh: THREE.Mesh;
  private readonly positions = new Float32Array(MAX * 4 * 3);
  private readonly colors = new Float32Array(MAX * 4 * 4);
  private readonly born = new Float32Array(MAX).fill(-Infinity);
  private readonly last = new Map<number, THREE.Vector3>();
  private readonly position: THREE.BufferAttribute;
  private readonly color: THREE.BufferAttribute;
  private next = 0;
  private clock = 0;
  private newest = -Infinity;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.color = new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage);
    const index = new Uint16Array(MAX * 6);
    for (let i = 0; i < MAX; i++) index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    geometry.setAttribute("position", this.position);
    geometry.setAttribute("color", this.color);
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const material = new THREE.MeshBasicMaterial({
      color: 0x16141c,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      // Pulled toward the camera, so the marks sit on the road instead of flickering into it.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    // The strips are spread over the whole map, so the bounds never help.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  /** A sliding wheel is at this point. `key` names the wheel, so each one draws its own line. */
  lay(key: number, at: THREE.Vector3): void {
    const from = this.last.get(key);
    if (!from) {
      this.last.set(key, at.clone());
      return;
    }
    const dx = at.x - from.x;
    const dz = at.z - from.z;
    const length = Math.hypot(dx, dz);
    if (length < STEP) return;
    // A wheel that jumped, like a kart put back on the road, starts a fresh line.
    if (length < 4) this.strip(from, at, (-dz / length) * WIDTH * 0.5, (dx / length) * WIDTH * 0.5);
    from.copy(at);
  }

  /** The wheel stopped sliding: its next mark starts a new line. */
  lift(key: number): void {
    this.last.delete(key);
  }

  frame(dt: number): void {
    this.clock += dt;
    // Once every mark has faded there is nothing to update until the next slide.
    if (this.clock - this.newest > LIFE + 0.5) return;
    for (let i = 0; i < MAX; i++) {
      const alpha = DARKNESS * Math.max(0, 1 - (this.clock - this.born[i]!) / LIFE);
      for (let v = 0; v < 4; v++) this.colors[(i * 4 + v) * 4 + 3] = alpha;
    }
    this.color.needsUpdate = true;
  }

  private strip(a: THREE.Vector3, b: THREE.Vector3, ox: number, oz: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    const lift = 0.03;
    const corners = [a.x + ox, a.y + lift, a.z + oz, a.x - ox, a.y + lift, a.z - oz, b.x + ox, b.y + lift, b.z + oz, b.x - ox, b.y + lift, b.z - oz];
    this.positions.set(corners, i * 12);
    for (let v = 0; v < 4; v++) this.colors.set([1, 1, 1, DARKNESS], (i * 4 + v) * 4);
    this.born[i] = this.clock;
    this.newest = this.clock;
    this.position.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
