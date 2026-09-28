import { blendViews, type MatchView } from "../engine/view";
import { locate, scriptReplay, type ReplayScript, type ReplaySegment } from "./replay-script";

/** A still every step, so the deep slow motion of the strike blends between close frames. */
const EVERY_S = 1 / 61;
const KEEP_S = 8;
/** The replay starts early enough to show the scorer's run, and ends as the net bulges. */
const BEFORE_S = 4.2;
const AFTER_S = 0.9;

/** What the replay shows at a moment: the still, and the stage it is in. */
export interface ReplayFrame {
  view: MatchView;
  segment: ReplaySegment;
}

/**
 * Keeps the last few seconds of match stills, and cuts a goal replay
 * from them: the run, the strike and the net, each stage at its own
 * speed (see replay-script.ts).
 */
export class ReplayRecorder {
  private frames: MatchView[] = [];
  private lastAt = -Infinity;
  private clip: MatchView[] = [];
  private goalAt: number | null = null;
  script: ReplayScript | null = null;

  /** Whether a still taken at `time` would be kept, so a skipped one is never built. */
  wants(time: number): boolean {
    return time - this.lastAt >= EVERY_S;
  }

  record(view: MatchView): void {
    if (!this.wants(view.time)) return;
    this.lastAt = view.time;
    this.frames.push(view);
    // Dropped from the front in one go, not one at a time, which is costly on a long array.
    const old = this.frames.findIndex((f) => view.time - f.time <= KEEP_S);
    if (old > 0) this.frames.splice(0, old);
  }

  /** Marks the moment the ball crossed the line. */
  markGoal(time: number): void {
    this.goalAt = time;
  }

  /** Cuts the replay once the frames after the goal are in. */
  cut(): boolean {
    if (this.goalAt === null) return false;
    const from = this.goalAt - BEFORE_S;
    const to = this.goalAt + AFTER_S;
    this.clip = this.frames.filter((f) => f.time >= from && f.time <= to);
    this.goalAt = null;
    this.script = this.clip.length > 1 ? scriptReplay(this.clip) : null;
    return this.script !== null;
  }

  /** How long the cut replay runs, in seconds. */
  get length(): number {
    return this.script?.length ?? 0;
  }

  /** The replay `t` seconds in: the still blended between the two nearest, and its stage. */
  at(t: number): ReplayFrame | null {
    const script = this.script;
    if (!script || this.clip.length < 2) return null;
    const spot = locate(script, t);
    if (!spot) return null;
    let i = 1;
    while (i < this.clip.length - 1 && this.clip[i]!.time < spot.time) i++;
    const a = this.clip[i - 1]!;
    const b = this.clip[i]!;
    const f = Math.max(0, Math.min(1, (spot.time - a.time) / Math.max(1e-6, b.time - a.time)));
    return { view: blendViews(a, b, f), segment: spot.segment };
  }

  clear(): void {
    this.frames = [];
    this.clip = [];
    this.goalAt = null;
    this.script = null;
    this.lastAt = -Infinity;
  }
}
