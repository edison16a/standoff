import * as THREE from "three";
import type { Vec3 } from "../../engine/vec";

/**
 * The white guide line for a free kick or a penalty, as television shows
 * it: the ball's path through the air, and its shadow along the pitch.
 * It is the engine's own flight, so a bend put on with the curve shows
 * as the line bending. Rebuilt only when the path changes.
 */
export class AimLine {
  readonly group = new THREE.Group();
  private readonly air: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly ground: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly end: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private key = "";

  constructor() {
    const white = (opacity: number) => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    this.air = new THREE.Mesh(new THREE.BufferGeometry(), white(0.92));
    this.ground = new THREE.Mesh(new THREE.BufferGeometry(), white(0.45));
    this.end = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 28), white(0.95));
    this.air.renderOrder = 4;
    this.ground.renderOrder = 3;
    this.end.renderOrder = 4;
    this.group.add(this.ground, this.air, this.end);
    this.group.visible = false;
  }

  /** Shows the path, or hides the line when there is none. */
  update(path: readonly Vec3[] | null, time: number): void {
    const show = !!path && path.length > 2;
    this.group.visible = show;
    if (!show) return;
    const last = path[path.length - 1]!;
    const key = `${path.length}|${last.x.toFixed(3)}|${last.y.toFixed(3)}|${last.z.toFixed(3)}|${path[1]!.y.toFixed(3)}`;
    if (key !== this.key) {
      this.key = key;
      this.rebuild(path);
    }
    // A gentle pulse keeps the eye on it without flicker.
    this.air.material.opacity = 0.78 + 0.16 * Math.sin(time * 5);
  }

  private rebuild(path: readonly Vec3[]): void {
    const points = path.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = Math.min(160, points.length * 3);
    this.air.geometry.dispose();
    this.air.geometry = new THREE.TubeGeometry(curve, segments, 0.035, 6, false);
    const flat = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0.02, p.z)));
    this.ground.geometry.dispose();
    this.ground.geometry = ribbon(flat, segments, 0.05);
    const last = points[points.length - 1]!;
    // The ring marks where the ball meets the goal line, facing back along the flight.
    this.end.position.copy(last);
    const before = points[points.length - 2]!;
    this.end.lookAt(before);
  }

  dispose(): void {
    this.air.geometry.dispose();
    this.ground.geometry.dispose();
    this.end.geometry.dispose();
    this.air.material.dispose();
    this.ground.material.dispose();
    this.end.material.dispose();
  }
}

/** A flat strip along a curve on the turf, `half` metres either side of it. */
function ribbon(curve: THREE.Curve<THREE.Vector3>, segments: number, half: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const d = curve.getTangentAt(t);
    const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(half);
    positions.push(p.x + side.x, p.y, p.z + side.z, p.x - side.x, p.y, p.z - side.z);
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}
