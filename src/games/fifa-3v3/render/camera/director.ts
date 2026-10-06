import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import type { MatchView } from "../../engine/view";
import { BroadcastCamera } from "./broadcast";
import { ceremonyCamera } from "./ceremony-cam";
import { replayCam } from "./replay-cam";
import { stoppage } from "./stoppage";

/** Which camera is cutting to: the broadcast view, a close up, a replay angle, or the lobby's slow orbit. */
export type Shot = "tv" | "closeup" | "replay-kicker" | "replay-keeper" | "winners" | "ceremony" | "lobby" | "fixed" | "foul" | "card" | "setpiece" | "setpiece-follow";

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
  private readonly broadcast = new BroadcastCamera();
  private shake = 0;
  private aspect = 16 / 9;

  /** The point the camera looks at: what the replay and the ceremony keep in focus. */
  get target(): THREE.Vector3 {
    return this.look;
  }

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
        // Smoothed in its own springs (broadcast.ts), so the director follows it exactly.
        const f = this.broadcast.frame({ ball: b, players: view.athletes }, this.aspect, dt, cut);
        this.wantPos.set(f.pos.x, f.pos.y, f.pos.z);
        this.wantLook.set(f.look.x, f.look.y, f.look.z);
        fov = f.fov;
        rate = 1000;
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
      case "replay-kicker":
      case "replay-keeper": {
        const placed = replayCam(shot, view, focus, this.wantPos, this.wantLook);
        if (placed) {
          fov = placed.fov;
          rate = placed.rate;
        }
        break;
      }
      case "winners": {
        const at = focus ?? new THREE.Vector3();
        // A slow swing on the near side, never round the back where the goals and nets would get in the way.
        const a = Math.sin(time * 0.2) * 0.9;
        this.wantPos.set(at.x + Math.sin(a) * 11, 3.8, at.z + Math.cos(a) * 11);
        // Aimed a little to their right, so the winners stand in the left half beside the results card.
        this.wantLook.set(at.x + Math.cos(a) * 3, 1.1, at.z - Math.sin(a) * 3);
        fov = 30;
        rate = 2;
        break;
      }
      case "ceremony": {
        // Its own shots, cut and moved exactly by the ceremony's clock (see ceremony-cam.ts).
        const place = ceremonyCamera(view.ceremony?.t ?? 0, this.aspect);
        this.wantPos.set(place.pos.x, place.pos.y, place.pos.z);
        this.wantLook.set(place.look.x, place.look.y, place.look.z);
        fov = place.fov;
        rate = 1000;
        break;
      }
      case "fixed":
        this.wantPos.copy(this.fixed.pos);
        this.wantLook.copy(this.fixed.look);
        fov = this.fixed.fov;
        rate = 1000;
        break;
      case "foul":
      case "card":
      case "setpiece":
      case "setpiece-follow": {
        const placed = stoppage(shot, view, this.wantPos, this.wantLook);
        if (placed) {
          fov = placed.fov;
          rate = placed.rate;
        }
        break;
      }
      case "lobby": {
        // A slow orbit high over the stands and inside the towers, like the blimp shot before kick off.
        const a = time * 0.045 + 0.4;
        this.wantPos.set(Math.sin(a) * PITCH.halfLength * 1.25, 21, Math.cos(a) * PITCH.halfWidth * 1.75);
        this.wantLook.set(0, 0, 0);
        fov = 38;
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
