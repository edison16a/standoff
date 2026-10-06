import * as THREE from "three";
import type { Joints } from "./models/athlete-model";

/** Room for seven figures (three blobs each) and the ball. */
const MAX = 24;
const LIFT = 0.004;

const VERTEX = /* glsl */ `
  attribute float aStrength;
  varying vec2 vUv;
  varying float vStrength;
  void main() {
    vUv = uv * 2.0 - 1.0;
    vStrength = aStrength;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  varying float vStrength;
  void main() {
    float r = clamp(1.0 - length(vUv), 0.0, 1.0);
    gl_FragColor = vec4(0.0, 0.0, 0.0, vStrength * r * r * (3.0 - 2.0 * r));
  }
`;

const ankle = new THREE.Vector3();
const hips = new THREE.Vector3();
const m = new THREE.Matrix4();
const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const s = new THREE.Vector3();
const p = new THREE.Vector3();

/**
 * Contact shadows: the soft darkening where a body nearly touches the
 * floor, which the key light's shadow map is too coarse to give. A wide
 * pool under each player that fades as he leaves the floor, a tight dark
 * spot under each sole, and one under the ball that spreads and fades
 * as it rises. One instanced draw for all of them, and left out of the
 * floor's mirror.
 */
export class ContactShadows {
  readonly mesh: THREE.InstancedMesh;
  private readonly strength = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
  private count = 0;

  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute("aStrength", this.strength);
    const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  /** This frame's shadows: every figure on the floor, and the ball unless it is put away. */
  cast(figures: readonly (Joints | null)[], ball: THREE.Vector3 | null, radius: number): void {
    this.count = 0;
    for (const j of figures) if (j) this.figure(j);
    if (ball) this.ball(ball, radius);
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.strength.needsUpdate = true;
  }

  /** A figure's pool and footprints, from its bones. */
  private figure(j: Joints): void {
    // The pool sits under the hips; the root rises with a jump, and the pool spreads and fades with it.
    j.hips.getWorldPosition(hips);
    const up = Math.max(0, j.root.position.y);
    this.blob(hips.x, hips.z, 0.62 + up * 0.4, 0.42 * Math.max(0, 1 - up / 0.9));
    for (const bone of [j.ankleL, j.ankleR]) {
      bone.getWorldPosition(ankle);
      // The sole sits about eight centimetres under the ankle; the spot fades as the foot lifts.
      const lift = Math.max(0, ankle.y - 0.08);
      this.blob(ankle.x, ankle.z, 0.3 + lift * 0.6, 0.5 * Math.max(0, 1 - lift / 0.3));
    }
  }

  /** The ball's spot: tight and dark on the floor, broad and faint as it rises. */
  private ball(at: THREE.Vector3, radius: number): void {
    const lift = Math.max(0, at.y - radius);
    this.blob(at.x, at.z, radius * 2.4 + lift * 0.5, 0.55 * Math.max(0, 1 - lift / 1.4));
  }

  private blob(x: number, z: number, size: number, strength: number): void {
    if (strength <= 0.01 || this.count >= MAX) return;
    m.compose(p.set(x, LIFT, z), q, s.set(size, size, 1));
    this.mesh.setMatrixAt(this.count, m);
    this.strength.setX(this.count, strength);
    this.count++;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
