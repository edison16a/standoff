import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import { fitWidth } from "./fit";
import { aimFor, type Aim } from "./shots";

/**
 * Moves the broadcast camera. It chases the shot the moment calls for
 * with smooth damping, so it glides after the play rather than jerking
 * with every cut of a runner. A change of shot that would drag the
 * camera across the field cuts instead, like a director switching
 * cameras. A small shake marks the big hits.
 */
export class CameraDirector {
  readonly camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.3, 900);
  private readonly pos = new THREE.Vector3(-20, 8, 0);
  private readonly look = new THREE.Vector3(0, 0, 0);
  private fov = 52;
  private kind: Aim["kind"] | null = null;
  private shake = 0;
  private fixed: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } | null = null;

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Pins the camera, for looking closely at the models in the showcase. */
  setFixed(pos: THREE.Vector3, look: THREE.Vector3, fov: number): void {
    this.fixed = { pos: pos.clone(), look: look.clone(), fov };
  }

  /**
   * Which way is up the screen on the ground, as a unit vector in field
   * space. A phone's stick pushed up means this way, so the controls
   * follow the camera as it turns round after a turnover.
   */
  groundForward(): { x: number; z: number } {
    const d = this.camera.getWorldDirection(new THREE.Vector3());
    const l = Math.hypot(d.x, d.z);
    return l > 1e-3 ? { x: d.x / l, z: d.z / l } : { x: 1, z: 0 };
  }

  /** A jolt, 0 to 1, that dies away over half a second. */
  bump(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(view: MatchView, dt: number, time: number): void {
    const cam = this.camera;
    if (this.fixed) {
      cam.position.copy(this.fixed.pos);
      cam.lookAt(this.fixed.look);
      this.setFov(this.fixed.fov);
      return;
    }
    // Narrow screens see less of the field side to side, so the fit backs the camera up for them.
    const aim = fitWidth(aimFor(view, time), cam.aspect);
    const target = new THREE.Vector3(aim.pos.x, aim.pos.y, aim.pos.z);
    const look = new THREE.Vector3(aim.look.x, aim.look.y, aim.look.z);
    const cut = this.kind === null || (aim.kind !== this.kind && this.pos.distanceTo(target) > 25);
    this.kind = aim.kind;
    const k = cut ? 1 : 1 - Math.exp(-aim.rate * dt);
    this.pos.lerp(target, k);
    this.look.lerp(look, cut ? 1 : 1 - Math.exp(-aim.rate * 1.6 * dt));
    this.fov += (aim.fov - this.fov) * k;
    cam.position.copy(this.pos);
    if (this.shake > 0.001) {
      const s = this.shake * 0.12;
      cam.position.x += Math.sin(time * 71) * s;
      cam.position.y += Math.sin(time * 53 + 1) * s;
      this.shake *= Math.exp(-dt * 7);
    }
    cam.lookAt(this.look);
    this.setFov(this.fov);
  }

  private setFov(fov: number): void {
    if (Math.abs(this.camera.fov - fov) < 0.01) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
}
