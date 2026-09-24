import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import type { MatchView } from "../../engine/view";
import { attackSign } from "../../teams";

/** Which camera is cutting to: the broadcast view, a close up, a replay angle, or the lobby's slow orbit. */
export type Shot = "tv" | "closeup" | "replay-end" | "replay-side" | "winners" | "lobby" | "fixed";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Directs the one camera like a match broadcast: a high camera on the
 * near side panning with the ball, close ups on the celebrations,
 * replays from behind the goal or down at pitch level, and a slow orbit
 * of the winners at the end. Changing shot is a cut, as on television;
 * within a shot the camera glides.
 */
export class CameraDirector {
  readonly camera = new THREE.PerspectiveCamera(33, 16 / 9, 0.3, 700);
  private readonly pos = new THREE.Vector3(0, 13, 26);
  private readonly look = new THREE.Vector3();
  private readonly wantPos = new THREE.Vector3();
  private readonly wantLook = new THREE.Vector3();
  private shot: Shot | null = null;
  private readonly fixed = { pos: new THREE.Vector3(0, 10, 20), look: new THREE.Vector3(), fov: 30 };
  private shake = 0;
  private aspect = 16 / 9;

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Where the "fixed" shot stands, for the showcase's posed frames. */
  setFixed(pos: THREE.Vector3, look: THREE.Vector3, fov: number): void {
    this.fixed.pos.copy(pos);
    this.fixed.look.copy(look);
    this.fixed.fov = fov;
  }

  /** A jolt, for the post ringing or the net rippling. */
  bump(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(view: MatchView, shot: Shot, dt: number, time: number, focus?: THREE.Vector3): void {
    const cut = shot !== this.shot;
    this.shot = shot;
    let fov = 33;
    let rate = 3.2;
    const b = view.ball;
    switch (shot) {
      case "tv": {
        // Narrow screens need the camera further back to keep the play in frame.
        const back = clamp(1.7 / this.aspect, 0.85, 1.7);
        this.wantPos.set(clamp(b.x * 0.7, -10, 10), 8.6 * back, PITCH.halfWidth + 10 * back);
        this.wantLook.set(clamp(b.x * 0.92, -12.5, 12.5), 0, clamp(b.z * 0.35, -3.5, 3.5) - 0.4);
        fov = 31;
        break;
      }
      case "closeup": {
        const at = focus ?? new THREE.Vector3(b.x, 0, b.z);
        const swing = Math.sin(time * 0.35) * 0.6;
        this.wantPos.set(at.x + Math.sin(swing) * 5.2, 1.7, at.z + Math.cos(swing) * 5.2);
        this.wantLook.set(at.x, 1.15, at.z);
        fov = 30;
        rate = 2.4;
        break;
      }
      case "replay-end": {
        const s = view.scorer !== null ? attackSign(view.athletes[view.scorer]?.team ?? 0) : Math.sign(b.x) || 1;
        this.wantPos.set(s * (PITCH.halfLength + 6.5), 5.2, b.z * 0.4 + 4);
        this.wantLook.set(b.x, 0.8, b.z);
        fov = 36;
        rate = 5;
        break;
      }
      case "replay-side": {
        this.wantPos.set(b.x - 3, 1.3, PITCH.halfWidth + 3.5);
        this.wantLook.set(b.x, 0.9, b.z);
        fov = 34;
        rate = 4;
        break;
      }
      case "winners": {
        const at = focus ?? new THREE.Vector3();
        const a = time * 0.18;
        this.wantPos.set(at.x + Math.sin(a) * 11, 3.8, at.z + Math.cos(a) * 11);
        this.wantLook.set(at.x, 1.1, at.z);
        fov = 30;
        rate = 2;
        break;
      }
      case "fixed":
        this.wantPos.copy(this.fixed.pos);
        this.wantLook.copy(this.fixed.look);
        fov = this.fixed.fov;
        rate = 1000;
        break;
      case "lobby": {
        const a = time * 0.045 + 0.4;
        this.wantPos.set(Math.sin(a) * 31, 13, Math.cos(a) * 25);
        this.wantLook.set(0, 0, 0);
        fov = 40;
        rate = 1.5;
        break;
      }
    }
    const k = cut ? 1 : 1 - Math.exp(-dt * rate);
    this.pos.lerp(this.wantPos, k);
    this.look.lerp(this.wantLook, k);
    this.camera.fov += (fov - this.camera.fov) * (cut ? 1 : k);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const jolt = this.shake * this.shake * 0.35;
    this.camera.position.set(this.pos.x + Math.sin(time * 71) * jolt, this.pos.y + Math.sin(time * 83) * jolt, this.pos.z);
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
  }
}
