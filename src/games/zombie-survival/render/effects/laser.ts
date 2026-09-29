import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

/**
 * One player's laser sight: a thin beam in their colour from the gun's
 * laser module to whatever the gun points at. The crosshair marks the
 * spot itself, so the beam only ties each crosshair to its gun.
 */
export class Laser {
  readonly group = new THREE.Group();
  private readonly beam: THREE.Mesh;
  private readonly core: THREE.Mesh;

  constructor(colour: string) {
    const c = new THREE.Color(colour);
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    this.beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.5), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.group.add(this.beam, this.core);
  }

  /** Draws the beam from `from` to `to`. Hidden when `to` is null. */
  update(from: THREE.Vector3, to: THREE.Vector3 | null): void {
    this.group.visible = to !== null;
    if (!to) return;
    const length = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from).normalize();
    for (const [mesh, width] of [[this.beam, 0.012], [this.core, 0.0035]] as const) {
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(UP, dir);
      mesh.scale.set(width, length, width);
    }
  }

  dispose(): void {
    this.beam.geometry.dispose();
    for (const o of [this.beam, this.core]) (o.material as THREE.Material).dispose();
  }
}
