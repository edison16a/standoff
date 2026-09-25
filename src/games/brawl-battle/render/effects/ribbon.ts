import * as THREE from "three";

interface Point {
  x: number;
  y: number;
  z: number;
  at: number;
}

/**
 * A fading ribbon behind a moving point: the arc of a kick or a sword
 * cut, and the streak behind a fighter flung by a big hit. It lies flat
 * toward the camera, widest and brightest at the head, and each point
 * fades out `life` seconds after it was laid down.
 */
export class Ribbon {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly points: Point[] = [];
  private readonly positions: Float32Array;
  private readonly colours: Float32Array;
  private readonly colour = new THREE.Color();

  constructor(
    private readonly max: number,
    private readonly width: number,
    private readonly life: number,
    additive = true,
  ) {
    this.positions = new Float32Array(max * 2 * 3);
    this.colours = new Float32Array(max * 2 * 4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colours, 4));
    const index: number[] = [];
    for (let i = 0; i < max - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(index);
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  setColour(hex: string): void {
    this.colour.set(hex);
  }

  push(x: number, y: number, z: number, now: number): void {
    const last = this.points[this.points.length - 1];
    // Skip points laid on top of each other; they would pinch the ribbon.
    if (last && Math.hypot(x - last.x, y - last.y) < 0.02) {
      last.at = now;
      return;
    }
    if (this.points.length >= this.max) this.points.shift();
    this.points.push({ x, y, z, at: now });
  }

  clear(): void {
    this.points.length = 0;
  }

  update(now: number): void {
    while (this.points.length && now - this.points[0]!.at > this.life) this.points.shift();
    const n = this.points.length;
    const { positions: pos, colours: col, colour } = this;
    for (let i = 0; i < this.max; i++) {
      const p = this.points[Math.min(i, n - 1)];
      if (!p || i >= n) {
        col.fill(0, i * 8, i * 8 + 8);
        if (p) {
          pos.set([p.x, p.y, p.z, p.x, p.y, p.z], i * 6);
        }
        continue;
      }
      const prev = this.points[Math.max(0, i - 1)]!;
      const next = this.points[Math.min(n - 1, i + 1)]!;
      let dx = next.x - prev.x;
      let dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const fade = Math.max(0, 1 - (now - p.at) / this.life);
      const head = (i + 1) / n;
      const w = this.width * fade * (0.25 + 0.75 * head);
      pos.set([p.x - dy * w, p.y + dx * w, p.z, p.x + dy * w, p.y - dx * w, p.z], i * 6);
      const a = fade * head;
      col.set([colour.r, colour.g, colour.b, a, colour.r, colour.g, colour.b, a], i * 8);
    }
    const geo = this.mesh.geometry;
    geo.getAttribute("position").needsUpdate = true;
    geo.getAttribute("color").needsUpdate = true;
    this.mesh.visible = n > 1;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
