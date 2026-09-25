import { copyPose, stance, type RigPose } from "./rig/pose";

interface Frame {
  /** Match time in milliseconds. */
  t: number;
  poses: [RigPose, RigPose];
}

/** How much of the fight before the knockdown blow the replay shows, and after it. */
const BEFORE_MS = 1_700;
const AFTER_MS = 1_500;
const KEEP = 400;

/**
 * Speeds through the replay, in real milliseconds since it began, to
 * milliseconds of fight relative to the blow: nearly full speed through
 * the build up, a crawl through the blow itself, then easing back up as
 * the boxer drops. Returns the fight time and how slow it is running.
 */
export function replayClock(realMs: number): { t: number; slow: number } {
  const segments = [
    { until: -350, speed: 0.9 },
    { until: 500, speed: 0.22 },
    { until: AFTER_MS, speed: 0.6 },
  ];
  let t = -BEFORE_MS;
  let left = realMs;
  for (const segment of segments) {
    const span = segment.until - t;
    const takes = span / segment.speed;
    if (left <= takes) return { t: t + left * segment.speed, slow: segment.speed };
    left -= takes;
    t = segment.until;
  }
  return { t: AFTER_MS, slow: 1 };
}

/** The whole replay's length in real milliseconds. */
export const REPLAY_LENGTH = (() => {
  let ms = 0;
  while (replayClock(ms).t < AFTER_MS) ms += 10;
  return ms;
})();

/**
 * Keeps the last few seconds of both boxers' poses, and on a knockdown
 * keeps the moments either side of the blow, so the fight can end on a
 * slow motion replay of the punch that did it. Poses are recycled from a
 * pool, so recording allocates nothing after the first seconds.
 */
export class Recorder {
  private frames: Frame[] = [];
  private pool: Frame[] = [];
  private clip: Frame[] | null = null;
  private capturing: { impact: number; frames: Frame[] } | null = null;
  /** When the knockdown blow landed, in match time. */
  impactAt = 0;

  record(t: number, poses: readonly [RigPose, RigPose]): void {
    const last = this.frames[this.frames.length - 1];
    if (last && t <= last.t) return;
    const frame = this.pool.pop() ?? { t, poses: [stance(), stance()] };
    frame.t = t;
    copyPose(poses[0], frame.poses[0]);
    copyPose(poses[1], frame.poses[1]);
    this.frames.push(frame);
    if (this.capturing) {
      this.capturing.frames.push(clone(frame));
      if (t >= this.capturing.impact + AFTER_MS) {
        this.clip = this.capturing.frames;
        this.impactAt = this.capturing.impact;
        this.capturing = null;
      }
    }
    while (this.frames.length > KEEP || (this.frames.length > 2 && t - this.frames[0]!.t > BEFORE_MS + 500)) this.pool.push(this.frames.shift()!);
  }

  /** A knockdown blow landed at match time `t`. */
  knockdown(t: number): void {
    this.capturing = { impact: t, frames: this.frames.filter((f) => f.t >= t - BEFORE_MS).map(clone) };
  }

  /** Whether there is a knockdown to replay. It is finished off early if the fight ended before it had all its frames. */
  get ready(): boolean {
    if (this.capturing && this.capturing.frames.length > 1) {
      this.clip = this.capturing.frames;
      this.impactAt = this.capturing.impact;
      this.capturing = null;
    }
    return !!this.clip && this.clip.length > 1;
  }

  /** Both boxers' poses at `offset` milliseconds from the blow, blended between recorded frames. */
  pose(offset: number, out: [RigPose, RigPose]): void {
    const clip = this.clip;
    if (!clip || clip.length === 0) return;
    const t = this.impactAt + offset;
    let i = clip.findIndex((f) => f.t > t);
    if (i <= 0) i = i === 0 ? 1 : clip.length - 1;
    const a = clip[i - 1]!;
    const b = clip[i]!;
    const k = Math.max(0, Math.min(1, (t - a.t) / Math.max(1, b.t - a.t)));
    blendPose(a.poses[0], b.poses[0], k, out[0]);
    blendPose(a.poses[1], b.poses[1], k, out[1]);
  }

  reset(): void {
    this.pool.push(...this.frames);
    this.frames = [];
    this.clip = null;
    this.capturing = null;
  }
}

function clone(frame: Frame): Frame {
  return { t: frame.t, poses: [copyPose(frame.poses[0], stance()), copyPose(frame.poses[1], stance())] };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** A pose between two others, into `out`. Angles are small enough here to blend directly. */
export function blendPose(a: RigPose, b: RigPose, k: number, out: RigPose): RigPose {
  out.x = lerp(a.x, b.x, k);
  out.z = lerp(a.z, b.z, k);
  out.yaw = lerp(a.yaw, b.yaw + Math.round((a.yaw - b.yaw) / (Math.PI * 2)) * Math.PI * 2, k);
  out.hipHeight = lerp(a.hipHeight, b.hipHeight, k);
  for (const part of ["hips", "spine", "chest", "head"] as const) {
    out[part].pitch = lerp(a[part].pitch, b[part].pitch, k);
    out[part].yaw = lerp(a[part].yaw, b[part].yaw, k);
    out[part].lean = lerp(a[part].lean, b[part].lean, k);
  }
  for (const hand of ["left", "right"] as const) {
    out.hands[hand].target.lerpVectors(a.hands[hand].target, b.hands[hand].target, k);
    out.hands[hand].pole.lerpVectors(a.hands[hand].pole, b.hands[hand].pole, k);
    out.feet[hand].position.lerpVectors(a.feet[hand].position, b.feet[hand].position, k);
    out.feet[hand].yaw = lerp(a.feet[hand].yaw, b.feet[hand].yaw, k);
    out.gloveRoll[hand] = lerp(a.gloveRoll[hand], b.gloveRoll[hand], k);
  }
  return out;
}

export const REPLAY = { BEFORE_MS, AFTER_MS };
