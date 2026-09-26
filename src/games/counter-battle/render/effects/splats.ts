import * as THREE from "three";
import { splatTexture } from "../textures";

const MAX = 240;
const Z = new THREE.Vector3(0, 0, 1);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const s = new THREE.Vector3();
const p = new THREE.Vector3();
const c = new THREE.Color();

/**
 * Paint splats where shots land: on the bunkers and on the turf, in the
 * shooter's team colour, so a firefight leaves its mark on the field until
 * the round is over. One instanced draw, oldest reused first.
 */
export class Splats {
  readonly mesh: THREE.InstancedMesh;
  private next = 0;
  private used = 0;
  private readonly texture = splatTexture();
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly mat = new THREE.MeshStandardMaterial({ map: this.texture, transparent: true, depthWrite: false, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

  constructor() {
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
    // Colours from the start, so the material is built for them once.
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
  }

  /** A splat of `size` metres at `at`, lying flat on the surface facing `normal`. */
  add(at: THREE.Vector3, normal: THREE.Vector3, colour: THREE.ColorRepresentation, size: number, spin: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.used = Math.min(MAX, this.used + 1);
    q.setFromUnitVectors(Z, normal);
    q.multiply(q2.setFromAxisAngle(Z, spin * Math.PI * 2));
    // Stood a little off the surface, since the rounded bunkers curve away under a flat splat.
    p.copy(at).addScaledVector(normal, 0.012);
    s.setScalar(size);
    m.compose(p, q, s);
    this.mesh.setMatrixAt(i, m);
    this.mesh.setColorAt(i, c.set(colour));
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    this.next = 0;
    this.used = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.texture.dispose();
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
