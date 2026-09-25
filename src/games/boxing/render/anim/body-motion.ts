import type { MatchEvent } from "../../engine/events";
import { DUCK_DROP, SLIP_SIDE } from "../../engine/stance";
import type { Hand, PunchStyle } from "../../engine/types";
import type { RigPose } from "../rig/pose";
import type { AnimInput } from "./anim-input";
import type { PunchShape } from "./punch-curve";
import { Kick, Spring } from "./springs";

/** How far each punch turns the trunk (positive swings the right shoulder in) and steps in, in metres. */
const TURN: Record<PunchStyle, Record<Hand, number>> = {
  jab: { left: -0.22, right: 0.22 },
  cross: { left: -0.45, right: 0.5 },
  hook: { left: -0.55, right: 0.55 },
};
const LUNGE: Record<PunchStyle, number> = { jab: 0.1, cross: 0.16, hook: 0.1 };
/** The hips on the corner stool, a little over its seat. */
const SEAT_HEIGHT = 0.6;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function smooth01(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** How far through a knockdown fall: the knees go first, then the boxer topples back. */
export function fallParts(fall: number): { sag: number; topple: number } {
  return { sag: smooth01(fall / 0.35), topple: smooth01((fall - 0.35) / 0.65) };
}

/**
 * The trunk and head of one boxer: the bounce of the stance, ducking and
 * slipping, the turn and step into a punch, the head snapping back from
 * a hit, a stagger, a knockdown and the moods between rounds.
 */
export class BodyMotion {
  readonly guard = new Spring();
  readonly duck = new Spring();
  readonly slip = new Spring();
  readonly stagger = new Spring();
  readonly corner = new Spring();
  readonly cheer = new Spring();
  readonly slump = new Spring();
  readonly seat = new Spring();
  readonly rise = new Spring();
  fall = 0;
  private readonly headYaw = new Kick(160, 12);
  private readonly headPitch = new Kick(160, 12);
  private readonly chestPitch = new Kick(90, 11);
  private readonly chestYaw = new Kick(90, 11);
  private readonly phase: number;

  constructor(seed: number) {
    this.phase = seed * 1.7;
  }

  /** A punch that reached this boxer rocks the head away from where it came from. */
  onEvent(event: MatchEvent, me: number): void {
    if (event.type === "hit" && event.target === me) {
      const power = Math.min(2.2, event.damage / 6);
      const from = event.hand === "left" ? 1 : -1;
      if (event.style === "hook") {
        this.headYaw.hit(from * 14 * power);
        this.chestYaw.hit(from * 4 * power);
        this.headPitch.hit(-3 * power);
      } else {
        this.headPitch.hit(-11 * power);
        this.chestPitch.hit(-4 * power);
        this.headYaw.hit(from * (event.style === "cross" ? 4 : 2) * power);
      }
    }
    if (event.type === "block" && event.target === me) this.chestPitch.hit(-2.2);
  }

  update(input: AnimInput, pose: RigPose, shape: PunchShape, punch: { hand: Hand; style: PunchStyle } | null): void {
    const { fighter, dt, time, now } = input;
    const rocked = fighter.staggered(now);
    // The head goes where the match judges it, players and computer alike, so what is seen is what is hit.
    const head = fighter.input.head;
    this.guard.update(fighter.input.guard && !fighter.punching(now) ? 1 : 0, dt, 5);
    this.duck.update(clamp(-head.y / DUCK_DROP, 0, 1.3), dt, 16);
    this.slip.update(clamp(-head.x / SLIP_SIDE, -1.4, 1.4), dt, 16);
    this.rise.update(clamp(head.y, 0, 0.2), dt, 16);
    this.stagger.update(rocked ? 1 : 0, dt, 3);
    this.corner.update(input.mode === "corner" ? 1 : 0, dt, 1.2);
    this.seat.update(input.seated ? 1 : 0, dt, 2.5);
    this.cheer.update(input.mode === "win" ? 1 : 0, dt, 1.5);
    this.slump.update(input.mode === "lose" && !fighter.down ? 1 : 0, dt, 1);
    const duck = this.duck.value;
    const slip = this.slip.value;
    const stagger = this.stagger.value;
    const seat = this.seat.value;
    const resting = Math.max(this.corner.value, this.slump.value);

    // A boxer's bounce on the balls of the feet, calmer when covered up or resting.
    const bounce = Math.sin(time * Math.PI * 2 * 1.6 + this.phase) * 0.013 * (1 - 0.6 * this.guard.value) * (1 - resting);
    const standing = 0.92 + bounce - 0.24 * duck + this.rise.value - stagger * (0.06 + 0.03 * Math.sin(time * 8)) + 0.03 * resting;
    // On the stool the hips sit on the seat, and the boxer leans back against the corner.
    pose.hipHeight = standing + (SEAT_HEIGHT - standing) * seat;
    pose.hips.pitch = 0.05 + 0.2 * duck - 0.35 * seat;
    pose.hips.yaw = -0.25 * (1 - resting);
    pose.hips.lean = 0;
    pose.spine.pitch = 0.08 + 0.32 * duck - 0.08 * this.cheer.value + 0.15 * seat;
    pose.spine.yaw = 0.05 + 0.04 * Math.sin(time * 0.8 + this.phase);
    pose.spine.lean = 0.3 * slip + 0.03 * Math.sin(time * 1.1 + this.phase) + stagger * 0.18 * Math.sin(time * 2.7);
    pose.chest.pitch = 0.06 + this.chestPitch.update(dt) * 0.02;
    pose.chest.yaw = 0.05 + this.chestYaw.update(dt) * 0.02;
    pose.chest.lean = 0.14 * slip;

    let forward = 0;
    if (punch) {
      const turn = TURN[punch.style][punch.hand] * shape.turn;
      pose.spine.yaw += turn * 0.45;
      pose.chest.yaw += turn * 0.55;
      pose.hips.yaw += turn * 0.35;
      pose.spine.pitch += 0.1 * shape.lunge;
      forward = LUNGE[punch.style] * shape.lunge;
    }

    // The head keeps its eyes on the other boxer through all of that, then takes the hits on top.
    const trunkYaw = pose.hips.yaw + pose.spine.yaw + pose.chest.yaw;
    const trunkPitch = pose.hips.pitch + pose.spine.pitch + pose.chest.pitch;
    pose.head.yaw = -trunkYaw + this.headYaw.update(dt) * 0.02;
    pose.head.pitch = -trunkPitch * 0.75 + 0.12 + this.headPitch.update(dt) * 0.02 + 0.25 * stagger + 0.35 * this.slump.value - 0.25 * this.cheer.value;
    pose.head.lean = -0.4 * (pose.spine.lean + pose.chest.lean);

    this.applyFall(input, pose);
    const sideways = 0.07 * slip;
    const back = -0.45 * fallParts(this.fall).topple;
    const c = Math.cos(input.facing);
    const s = Math.sin(input.facing);
    pose.yaw = input.facing;
    pose.x = input.x + sideways * c + (forward + back) * s;
    pose.z = input.z - sideways * s + (forward + back) * c;
  }

  private applyFall(input: AnimInput, pose: RigPose): void {
    const down = input.fighter.down;
    let fall = 0;
    if (down) {
      fall = smooth01((input.now - down.since) / 1100);
      if (down.risingAt !== null) fall = Math.min(fall, 1 - smooth01((input.now - down.risingAt) / 1300));
    }
    this.fall = fall;
    if (fall <= 0) return;
    const { sag, topple } = fallParts(fall);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    pose.hipHeight = lerp(lerp(pose.hipHeight, 0.6, sag), 0.17, topple);
    pose.hips.pitch = lerp(lerp(pose.hips.pitch, 0.3, sag), -1.45, topple);
    pose.hips.yaw *= 1 - topple;
    pose.spine.pitch = lerp(lerp(pose.spine.pitch, 0.4, sag), 0.05, topple);
    pose.spine.lean *= 1 - sag;
    pose.chest.pitch = lerp(pose.chest.pitch, 0.02, topple);
    pose.head.pitch = lerp(lerp(pose.head.pitch, 0.55, sag), -0.15, topple);
    pose.head.yaw = lerp(pose.head.yaw, 0.45, topple);
    // A boxer who is down still stirs a little while the count goes on.
    pose.head.lean = 0.1 * Math.sin(input.time * 1.3) * topple;
  }
}
