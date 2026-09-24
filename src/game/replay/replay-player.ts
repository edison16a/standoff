import type { GameEvent } from "../events";
import type { FencerFrame, SceneFrame } from "../frames";

/** How much of the exchange before the touch the replay shows. */
export const REPLAY_LEAD_MS = 3200;
/** How long the replay lingers after the touch. */
export const REPLAY_TAIL_MS = 900;
/** The slow motion window around the touch, and how slow it gets. */
const SLOW_BEFORE_MS = 450;
const SLOW_AFTER_MS = 300;
const SLOW_RATE = 0.3;

/**
 * Plays a recorded clip back. Playback runs at normal speed, drops to
 * slow motion just around the touch, then speeds back up. Frames are
 * interpolated, so the slow part stays smooth even though the recording
 * only has one frame per sim tick.
 */
export class ReplayPlayer {
  private cursor = 0;
  private readonly slowStart: number;
  private readonly slowEnd: number;
  private readonly start: number;
  private readonly end: number;
  readonly durationMs: number;

  constructor(
    private readonly frames: SceneFrame[],
    private readonly events: GameEvent[],
    /** Clip time of the touch, the moment the slow motion centres on. */
    focus: number,
  ) {
    this.start = frames[0]?.t ?? focus;
    this.end = frames[frames.length - 1]?.t ?? focus;
    this.slowStart = Math.max(this.start, focus - SLOW_BEFORE_MS);
    this.slowEnd = Math.min(this.end, focus + SLOW_AFTER_MS);
    const slowSpan = this.slowEnd - this.slowStart;
    this.durationMs = this.end - this.start - slowSpan + slowSpan / SLOW_RATE;
  }

  /** Maps time since the replay began onto time inside the clip. */
  clipTime(elapsed: number): number {
    const beforeSlow = this.slowStart - this.start;
    if (elapsed <= beforeSlow) return this.start + elapsed;
    const slowWall = (this.slowEnd - this.slowStart) / SLOW_RATE;
    if (elapsed <= beforeSlow + slowWall) return this.slowStart + (elapsed - beforeSlow) * SLOW_RATE;
    return Math.min(this.end, this.slowEnd + (elapsed - beforeSlow - slowWall));
  }

  isSlow(elapsed: number): boolean {
    const t = this.clipTime(elapsed);
    return t > this.slowStart && t < this.slowEnd;
  }

  isFinished(elapsed: number): boolean {
    return elapsed >= this.durationMs;
  }

  /** The scene at a clip time, blended between the two nearest frames. */
  frameAt(elapsed: number): SceneFrame | null {
    const t = this.clipTime(elapsed);
    const next = this.frames.findIndex((frame) => frame.t >= t);
    if (next === -1) return this.frames[this.frames.length - 1] ?? null;
    const b = this.frames[next]!;
    const a = this.frames[next - 1];
    if (!a || b.t === a.t) return b;
    const k = (t - a.t) / (b.t - a.t);
    return { t, fencers: [blend(a.fencers[0], b.fencers[0], k), blend(a.fencers[1], b.fencers[1], k)] };
  }

  /** Events the playhead passed since the last call, so sounds replay too. */
  eventsUntil(elapsed: number): GameEvent[] {
    const t = this.clipTime(elapsed);
    const passed: GameEvent[] = [];
    while (this.cursor < this.events.length && this.events[this.cursor]!.t <= t) {
      passed.push(this.events[this.cursor]!);
      this.cursor += 1;
    }
    return passed;
  }
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Continuous values blend. Discrete ones (the action) come from the earlier frame. */
function blend(a: FencerFrame, b: FencerFrame, k: number): FencerFrame {
  const sameAction = a.action === b.action;
  return {
    ...a,
    x: lerp(a.x, b.x, k),
    pitch: lerp(a.pitch, b.pitch, k),
    yaw: lerp(a.yaw, b.yaw, k),
    roll: lerp(a.roll, b.roll, k),
    speed: lerp(a.speed, b.speed, k),
    stride: lerp(a.stride, b.stride, k),
    actionMs: sameAction ? lerp(a.actionMs, b.actionMs, k) : a.actionMs,
  };
}
