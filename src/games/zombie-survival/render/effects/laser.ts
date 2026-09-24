import * as THREE from "three";
import { glowTexture } from "../textures";

const UP = new THREE.Vector3(0, 1, 0);

/**
 * One player's laser sight: a thin beam in their colour from the gun's
 * laser module to whatever it points at, and a bright dot there that
 * stays the same size on screen however far away it lands.
 */
export class Laser {
  readonly group = new THREE.Group();
  private readonly beam: THREE.Mesh;
  private readonly core: THREE.Mesh;
  private readonly dot: THREE.Sprite;
  private readonly spot: THREE.Sprite;

  constructor(colour: string) {
    const c = new THREE.Color(colour);
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    this.beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.5), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: c, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
    this.spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
    this.dot.renderOrder = this.spot.renderOrder = 20;
    this.group.add(this.beam, this.core, this.dot, this.spot);
  }

  /** Draws the beam from `from` to `to`, seen from `eye`. Hidden when `to` is null. */
  update(from: THREE.Vector3, to: THREE.Vector3 | null, eye: THREE.Vector3, time: number): void {
    this.group.visible = to !== null;
    if (!to) return;
    const length = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from).normalize();
    for (const [mesh, width] of [[this.beam, 0.014], [this.core, 0.004]] as const) {
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(UP, dir);
      mesh.scale.set(width, length, width);
    }
    const flicker = 0.9 + Math.sin(time * 40) * 0.05 + Math.random() * 0.05;
    const size = eye.distanceTo(to) * 0.03;
    this.dot.position.copy(to);
    this.dot.scale.setScalar(size * 1.6 * flicker);
    this.spot.position.copy(to);
    this.spot.scale.setScalar(size * 0.45);
  }

  dispose(): void {
    this.beam.geometry.dispose();
    for (const o of [this.beam, this.core]) (o.material as THREE.Material).dispose();
    this.dot.material.dispose();
    this.spot.material.dispose();
  }
}
