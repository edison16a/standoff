import * as THREE from "three";
import type { MatchView } from "../engine/view";
import { PITCH } from "../engine/tuning";
import type { Pose } from "./scene";

/** How fast the camera catches up with the play, per second. */
const RATE = 3;
/** Seconds of ball travel the camera looks ahead. */
const LEAD = 0.25;
/** Held back this far while the charge bar is down, and this much closer while it fills. */
const FAR = 1;
const NEAR = 0.78;

/**
 * The loop's camera: the broadcast camera's side on view, but lower and
 * nearer the ball, so the skill moves and the charge bar over the
 * shooter read on a small tile. It still sees a good stretch of the big
 * pitch and its lines around the ball. It moves only by the filmed
 * clock, so every capture frames the same.
 */
export class FollowCam {
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private zoom = FAR;
  private last = -1;

  pose(view: MatchView, nowMs: number): Pose {
    const dt = this.last < 0 ? 0 : Math.min(0.1, (nowMs - this.last) / 1000);
    const first = this.last < 0;
    this.last = nowMs;
    const b = view.ball;
    const charging = view.athletes.some((a) => a.bar);
    const k = first ? 1 : 1 - Math.exp(-dt * RATE);
    this.zoom += ((charging ? NEAR : FAR) - this.zoom) * (first ? 1 : k * 0.6);
    const HL = PITCH.halfLength;
    const HW = PITCH.halfWidth;
    // Where the ball is going, not where it is, so a struck shot is not left behind; never past the goal.
    const lookX = THREE.MathUtils.clamp(b.x + b.vx * LEAD, -HL + 3, HL - 3);
    const lookZ = THREE.MathUtils.clamp(b.z + b.vz * LEAD, -HW + 1.5, HW - 1.5);
    const wantLook = new THREE.Vector3(lookX, 0.4, lookZ);
    const wantPos = new THREE.Vector3(lookX * 0.92, 5.6 * this.zoom, lookZ + 12 * this.zoom);
    if (first) {
      this.pos.copy(wantPos);
      this.look.copy(wantLook);
    } else {
      this.pos.lerp(wantPos, k);
      this.look.lerp(wantLook, k);
    }
    return { pos: this.pos.clone(), look: this.look.clone(), fov: 32 };
  }
}
