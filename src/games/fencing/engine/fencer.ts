import type { CharacterId } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";
import type { FencerAction, FencerFrame } from "./frames";
import { EN_GARDE_X, MAX_SPEED } from "./rules";

/** Live controller values as last received from the phone. */
export interface ControllerInput {
  pitch: number;
  yaw: number;
  roll: number;
  move: number;
}

/**
 * How quickly the drawn blade catches up with the phone. Motion frames
 * arrive at an uneven 50 to 60 Hz over WiFi, and a touch of smoothing hides
 * that jitter without making the sword feel laggy.
 */
const POSE_SMOOTHING_PER_S = 30;
/** How much aim history to keep, in ticks. A third of a second at 60 Hz. */
const AIM_HISTORY = 20;

interface AimSample {
  t: number;
  pitch: number;
  yaw: number;
}

/**
 * One fencer on the host. It holds the live controller reading, walks the
 * body along the strip, and tracks the timed state (jab, parry window,
 * deflection) that the referee reads.
 */
export class Fencer {
  readonly facing: 1 | -1;
  characterId: CharacterId;
  x: number;
  speed = 0;
  input: ControllerInput = { pitch: 0, yaw: 0, roll: 0, move: 0 };
  private pose = { pitch: 0, yaw: 0, roll: 0 };
  action: FencerAction = "idle";
  actionStartedAt = 0;
  parryUntil = -Infinity;
  /** A parry that blocked nothing leaves the guard down until then. */
  parryReadyAt = -Infinity;
  lockedUntil = -Infinity;
  /** This fencer's own clock, advanced by `followPose`, which stamps the aim history. */
  private clock = 0;
  private history: AimSample[] = [];

  constructor(
    readonly slot: Slot,
    characterId: CharacterId,
  ) {
    this.facing = slot === 1 ? 1 : -1;
    this.characterId = characterId;
    this.x = this.startX;
  }

  /** The en garde line on this fencer's side. */
  get startX(): number {
    return -this.facing * EN_GARDE_X;
  }

  /** The tip angles as currently drawn, after smoothing. */
  get aim(): { pitch: number; yaw: number } {
    return this.pose;
  }

  /** Where the blade pointed `ms` ago, or as far back as the history goes. */
  aimBefore(ms: number): { pitch: number; yaw: number } {
    const at = this.clock - ms;
    const sample = this.history.find((entry) => entry.t >= at) ?? this.history.at(-1);
    return sample ? { pitch: sample.pitch, yaw: sample.yaw } : { ...this.pose };
  }

  setAction(action: FencerAction, now: number): void {
    this.action = action;
    this.actionStartedAt = now;
  }

  /** Puts the fencer back on the line, standing still, for a new exchange. */
  reset(x = this.startX): void {
    this.x = x;
    this.speed = 0;
    this.action = "idle";
    this.parryUntil = -Infinity;
    this.parryReadyAt = -Infinity;
    this.lockedUntil = -Infinity;
    this.input = { ...this.input, move: 0 };
  }

  /** Walks the body forward or back from the controller's footwork value. */
  walk(dtMs: number, allowed: boolean): void {
    const dt = dtMs / 1000;
    this.speed = allowed ? this.input.move * MAX_SPEED : 0;
    this.x += this.speed * this.facing * dt;
  }

  /** Eases the drawn blade toward the latest phone reading. */
  followPose(dtMs: number): void {
    const k = 1 - Math.exp((-POSE_SMOOTHING_PER_S * dtMs) / 1000);
    this.pose.pitch += (this.input.pitch - this.pose.pitch) * k;
    this.pose.yaw += (this.input.yaw - this.pose.yaw) * k;
    this.pose.roll += (this.input.roll - this.pose.roll) * k;
    this.clock += dtMs;
    this.history.push({ t: this.clock, pitch: this.pose.pitch, yaw: this.pose.yaw });
    if (this.history.length > AIM_HISTORY) this.history.shift();
  }

  frame(now: number): FencerFrame {
    return {
      slot: this.slot,
      characterId: this.characterId,
      x: this.x,
      facing: this.facing,
      pitch: this.pose.pitch,
      yaw: this.pose.yaw,
      roll: this.pose.roll,
      speed: this.speed,
      action: this.action,
      actionMs: now - this.actionStartedAt,
      parrying: now < this.parryUntil,
    };
  }
}
