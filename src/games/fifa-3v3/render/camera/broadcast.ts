import { PITCH } from "../../engine/tuning";

/** What the broadcast camera reads each frame: the ball and where the players stand. */
export interface PlayInput {
  ball: { x: number; z: number; vx: number; vz: number };
  players: readonly { x: number; z: number }[];
}

export interface BroadcastFrame {
  pos: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
  fov: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const HL = PITCH.halfLength;

/** Lens limits: tight on a close tussle, wide when play opens up. */
export const FOV = { tight: 26, wide: 34 } as const;

/**
 * A critically damped spring toward a target: it settles as fast as it
 * can without overshooting, and its speed never jumps, so the pan
 * starts and stops smoothly as a camera operator's does.
 */
class Spring {
  value: number;
  private speed = 0;

  constructor(value: number, private readonly stiffness: number) {
    this.value = value;
  }

  step(target: number, dt: number): number {
    const w = this.stiffness;
    // Small steps keep the spring stable however long a frame was.
    for (let left = dt; left > 1e-6; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120);
      this.speed += (w * w * (target - this.value) - 2 * w * this.speed) * h;
      this.value += this.speed * h;
    }
    return this.value;
  }

  jump(value: number): void {
    this.value = value;
    this.speed = 0;
  }
}

/**
 * The main broadcast camera, high on the near side. It pans after the
 * ball with a smooth lead into the space the play is moving toward,
 * stops short of each end so the goal stays in the picture, and zooms
 * gently: in when the players are bunched round the ball, out when the
 * play is stretched or the ball is flying.
 */
export class BroadcastCamera {
  private readonly leadX = new Spring(0, 1.2);
  private readonly panX = new Spring(0, 2.1);
  private readonly panZ = new Spring(0, 1.6);
  private readonly zoom = new Spring(30, 0.9);

  /** `aspect` is the screen's; `cut` snaps straight to the play, as a cut from another camera does. */
  frame(play: PlayInput, aspect: number, dt: number, cut: boolean): BroadcastFrame {
    const b = play.ball;
    // The lead is how far ahead of the ball the camera looks: the ball's pace along the pitch, eased so a back pass does not whip it round.
    const lead = clamp(b.vx * 0.45, -5, 5);
    const spread = spreadAround(play);
    const fovTarget = clamp(FOV.tight + (spread - 6) * 0.55 + Math.hypot(b.vx, b.vz) * 0.12, FOV.tight, FOV.wide);
    const lookTarget = clamp(b.x * 0.92, -HL * 0.78, HL * 0.78);
    if (cut) {
      this.leadX.jump(lead);
      this.panX.jump(lookTarget + lead);
      this.panZ.jump(b.z);
      this.zoom.jump(fovTarget);
    }
    const ahead = this.leadX.step(lead, dt);
    const x = clamp(this.panX.step(lookTarget + ahead, dt), -HL * 0.8, HL * 0.8);
    const z = this.panZ.step(b.z, dt);
    const fov = this.zoom.step(fovTarget, dt);
    // Narrow screens need the camera further back to keep the play in frame.
    const back = clamp(1.7 / aspect, 0.85, 1.7);
    return {
      pos: { x: clamp(x * 0.76, -HL * 0.62, HL * 0.62), y: 10 * back, z: PITCH.halfWidth + 11.5 * back },
      look: { x, y: 0, z: clamp(z * 0.35, -4.5, 4.5) - 0.4 },
      fov,
    };
  }
}

/** How far the play stretches round the ball: the mean distance to the three players nearest it, in metres. */
export function spreadAround(play: PlayInput): number {
  const d = play.players.map((p) => Math.hypot(p.x - play.ball.x, p.z - play.ball.z)).sort((a, b) => a - b);
  const near = d.slice(0, 3);
  return near.length ? near.reduce((s, v) => s + v, 0) / near.length : 8;
}
