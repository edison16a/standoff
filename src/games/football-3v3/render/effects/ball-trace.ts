import * as THREE from "three";

/** A point on the ball's flight, with the match time it was there. */
export interface TracePoint {
  t: number;
  x: number;
  y: number;
  z: number;
}

const RADIAL = 8;

/**
 * The replay's traced ball path: a glowing ribbon that draws itself
 * behind the spiral from the QB's hand into the catcher's, like a
 * broadcast's ball tracker. The whole tube is built once per replay and
 * revealed segment by segment, so nothing is rebuilt per frame.
 */
export class BallTrace {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  private mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> | null = null;
  private points: readonly TracePoint[] | null = null;
  private segments = 0;

  /** The path for this replay, or null to clear it. The same list again keeps the built tube. */
  set(points: readonly TracePoint[] | null): void {
    if (points === this.points) return;
    this.points = points;
    this.clear();
    if (!points || points.length < 3) return;
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    this.segments = Math.min(240, points.length * 2);
    const geometry = new THREE.TubeGeometry(curve, this.segments, 0.07, RADIAL, false);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 3;
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  /** Shows the path up to match time `time`, the moment the replay is at. */
  update(time: number | null): void {
    const mesh = this.mesh;
    const points = this.points;
    if (!mesh || !points || time === null) {
      if (mesh) mesh.visible = false;
      return;
    }
    const t0 = points[0]!.t;
    const t1 = points[points.length - 1]!.t;
    const f = Math.max(0, Math.min(1, (time - t0) / Math.max(1e-3, t1 - t0)));
    mesh.visible = f > 0;
    mesh.geometry.setDrawRange(0, Math.floor(f * this.segments) * RADIAL * 6);
  }

  private clear(): void {
    if (!this.mesh) return;
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh = null;
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
  }
}
