import type { FencerAction, FencerFrame } from "@/game/frames";
import { ACTION_POSES } from "./action-poses";
import { lerp, lerpVec } from "./geometry";
import { livePose } from "./guard-pose";
import type { Pose } from "./skeleton";

type Channel = Exclude<FencerAction, "idle">;

interface ChannelSpec {
  /** Whether this action should currently be showing. */
  active: (frame: FencerFrame) => boolean;
  /** Time constants in ms. Rising fast and falling slower reads as a snap then a spring back. */
  rise: number;
  fall: number;
}

const CHANNELS: Record<Channel, ChannelSpec> = {
  jab: { active: (f) => f.action === "jab" && f.actionMs < 230, rise: 38, fall: 85 },
  parry: { active: (f) => f.action === "parry" && f.parrying, rise: 25, fall: 90 },
  deflected: { active: (f) => f.action === "deflected" && f.actionMs < 350, rise: 20, fall: 120 },
  hit: { active: (f) => f.action === "hit" && f.actionMs < 700, rise: 40, fall: 220 },
  victory: { active: (f) => f.action === "victory", rise: 260, fall: 200 },
  defeat: { active: (f) => f.action === "defeat", rise: 320, fall: 200 },
};

const ORDER = Object.keys(CHANNELS) as Channel[];

/**
 * The small state machine that sits on top of live tracking. Each action
 * has a weight that eases toward 1 while the action is on and back to 0
 * after, and the final pose is the live pose blended toward each action
 * pose by its weight. That is how a jab briefly overrides the tracked
 * sword and then springs back to following the phone.
 *
 * Weights advance by the frame's own clock, so in a slow motion replay the
 * springs slow down with everything else.
 */
export class Animator {
  private readonly weights: Record<Channel, number> = { jab: 0, parry: 0, deflected: 0, hit: 0, victory: 0, defeat: 0 };
  private lastT: number | null = null;

  pose(frame: FencerFrame, timeMs: number): Pose {
    let dt = this.lastT === null ? 0 : timeMs - this.lastT;
    // Time went backwards (a replay just started) or jumped: settle instantly.
    if (dt < 0 || dt > 250) {
      this.snap(frame);
      dt = 0;
    }
    this.lastT = timeMs;

    let pose = livePose(frame, timeMs);
    for (const channel of ORDER) {
      const spec = CHANNELS[channel];
      const target = spec.active(frame) ? 1 : 0;
      const tau = target > this.weights[channel] ? spec.rise : spec.fall;
      this.weights[channel] += (target - this.weights[channel]) * (1 - Math.exp(-dt / tau));
      const weight = this.weights[channel];
      if (weight > 0.001) pose = blendPose(pose, ACTION_POSES[channel](pose), weight);
    }
    return pose;
  }

  private snap(frame: FencerFrame): void {
    for (const channel of ORDER) this.weights[channel] = CHANNELS[channel].active(frame) ? 1 : 0;
  }
}

export function blendPose(a: Pose, b: Pose, k: number): Pose {
  return {
    hips: lerpVec(a.hips, b.hips, k),
    lean: lerp(a.lean, b.lean, k),
    nod: lerp(a.nod, b.nod, k),
    frontFoot: lerpVec(a.frontFoot, b.frontFoot, k),
    backFoot: lerpVec(a.backFoot, b.backFoot, k),
    hand: lerpVec(a.hand, b.hand, k),
    bladeAngle: lerp(a.bladeAngle, b.bladeAngle, k),
    bladeYaw: lerp(a.bladeYaw, b.bladeYaw, k),
    wrist: lerp(a.wrist, b.wrist, k),
    backHand: lerpVec(a.backHand, b.backHand, k),
  };
}
