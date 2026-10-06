import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import { broadcastAim, Spring3 } from "./broadcast";
import { ceremonyAim } from "./ceremony-cam";
import { fitWidth } from "./fit";
import { replayAim, type ReplayShot } from "./replay-shots";
import { aimFor, type Aim } from "./shots";

/** Metres from the wanted spot beyond which the camera cuts instead of gliding. A live chase never lags this far. */
const CUT_DISTANCE = 25;

/**
 * Moves the broadcast camera. It chases the shot the moment calls for
 * with smooth damping, so it glides after the play rather than jerking
 * with every cut of a runner. A move that would drag the camera
 * across the field cuts instead, like a director switching cameras. A small shake marks the big hits.
 */
export class CameraDirector {
  readonly camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.3, 900);
  /** The camera's spot and where it looks, each on a spring so moves ease in and out like a heavy broadcast head. */
  private readonly pos = new Spring3();
  private readonly look = new Spring3();
  private fov = 52;
  private kind: Aim["kind"] | null = null;
  private shake = 0;
  private fixed: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } | null = null;
  private replay: ReplayShot | null = null;

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Pins the camera, for looking closely at the models in the showcase. */
  setFixed(pos: THREE.Vector3, look: THREE.Vector3, fov: number): void {
    this.fixed = { pos: pos.clone(), look: look.clone(), fov };
  }

  /**
   * Films the touchdown replay's angles instead of the live shots, or
   * goes back to them with null. Going in or out of a replay is a cut,
   * like the broadcast's swoosh, never a sweep across the field.
   */
  setReplay(shot: ReplayShot | null): void {
    if ((shot === null) !== (this.replay === null)) this.kind = null;
    this.replay = shot;
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

  /** The replay angle being filmed, or null in live play. */
  get replayShot(): ReplayShot | null {
    return this.replay;
  }

  /** Moves the camera for this frame; returns true when it cut rather than glided. */
  update(view: MatchView, dt: number, time: number): boolean {
    const cam = this.camera;
    if (this.fixed) {
      cam.position.copy(this.fixed.pos);
      cam.lookAt(this.fixed.look);
      this.setFov(this.fixed.fov);
      return true;
    }
    // Narrow screens see less of the field side to side, so the fit backs the camera up for them.
    const aim = this.replay
      ? replayAim(view, this.replay)
      : view.ceremony
        ? ceremonyAim(view.ceremony.t, cam.aspect)
        : fitWidth(broadcastAim(aimFor(view, time), view), cam.aspect);
    const target = new THREE.Vector3(aim.pos.x, aim.pos.y, aim.pos.z);
    const look = new THREE.Vector3(aim.look.x, aim.look.y, aim.look.z);
    // Far from the shot means a new scene, like the lobby's demo giving way to the game or the ball spotted downfield: cut to it.
    // The trophy presentation opens on a cut too, as the broadcast switches to it.
    const at = this.pos.at;
    const cut = this.kind === null || target.distanceTo(new THREE.Vector3(at.x, at.y, at.z)) > CUT_DISTANCE || (aim.kind === "ceremony" && this.kind !== "ceremony");
    this.kind = aim.kind;
    if (cut) {
      this.pos.snap(target);
      this.look.snap(look);
    } else {
      // A critically damped spring at about twice the rate keeps the same lag as the old chase, with softer starts.
      this.pos.step(target, aim.rate * 1.8, dt);
      this.look.step(look, aim.rate * 2.9, dt);
    }
    const k = cut ? 1 : 1 - Math.exp(-aim.rate * dt);
    this.fov += (aim.fov - this.fov) * k;
    cam.position.set(at.x, at.y, at.z);
    if (this.shake > 0.001 && aim.kind !== "ceremony") {
      const s = this.shake * 0.12;
      cam.position.x += Math.sin(time * 71) * s;
      cam.position.y += Math.sin(time * 53 + 1) * s;
      this.shake *= Math.exp(-dt * 7);
    }
    cam.lookAt(this.look.at.x, this.look.at.y, this.look.at.z);
    this.setFov(this.fov);
    return cut;
  }

  private setFov(fov: number): void {
    if (Math.abs(this.camera.fov - fov) < 0.01) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
}
