import * as THREE from "three";

/**
 * Glowing rings on the turf. The target ring lights up magenta under the
 * receiver the throw stick is on, and a thin team coloured ring marks
 * each player a person controls, so everyone can find themselves.
 */
export class Ring {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private glow = 0;

  /** `solid` paints the colour as is; additive glows but washes a strong colour out on the grass. */
  constructor(color: THREE.ColorRepresentation, inner: number, outer: number, solid = false) {
    const blending = solid ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
  }

  /** Fades in and out rather than popping, and pulses while shown when `pulse` is set. */
  update(on: boolean, x: number, z: number, time: number, dt: number, strength = 1, pulse = false): void {
    this.glow += ((on ? 1 : 0) - this.glow) * (1 - Math.exp(-dt * 14));
    this.mesh.visible = this.glow > 0.02;
    if (!this.mesh.visible) return;
    this.mesh.position.set(x, 0.03, z);
    const beat = pulse ? 0.75 + 0.25 * Math.sin(time * 9) : 1;
    this.material.opacity = this.glow * strength * beat;
    this.mesh.scale.setScalar(pulse ? 1 + 0.06 * Math.sin(time * 9) : 1);
  }

  setColor(color: THREE.ColorRepresentation): void {
    this.material.color.set(color);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
