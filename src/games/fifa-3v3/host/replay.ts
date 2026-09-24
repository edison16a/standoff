import { blendViews, type MatchView } from "../engine/view";

/** Stills are kept this often, which is plenty to blend smooth slow motion from. */
const EVERY_S = 1 / 30;
const KEEP_S = 7;
/** The replay shows this much before the goal and a moment after, as the net bulges. */
const BEFORE_S = 3.3;
const AFTER_S = 0.7;
export const REPLAY_SPEED = 0.7;

/**
 * Keeps the last few seconds of match stills, and cuts a goal replay
 * from them: the build up, the strike and the net, played back slower.
 */
export class ReplayRecorder {
  private frames: MatchView[] = [];
  private lastAt = -Infinity;
  private clip: MatchView[] = [];
  private goalAt: number | null = null;

  record(view: MatchView): void {
    if (view.time - this.lastAt < EVERY_S) return;
    this.lastAt = view.time;
    this.frames.push(view);
    while (this.frames.length && view.time - this.frames[0]!.time > KEEP_S) this.frames.shift();
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
    return this.clip.length > 1;
  }

  /** How long the cut replay runs at replay speed, in seconds. */
  get length(): number {
    if (this.clip.length < 2) return 0;
    return (this.clip[this.clip.length - 1]!.time - this.clip[0]!.time) / REPLAY_SPEED;
  }

  /** The replay's still `t` seconds in, blended between the two nearest. */
  at(t: number): MatchView | null {
    if (this.clip.length < 2) return null;
    const start = this.clip[0]!.time;
    const want = start + t * REPLAY_SPEED;
    let i = 1;
    while (i < this.clip.length - 1 && this.clip[i]!.time < want) i++;
    const a = this.clip[i - 1]!;
    const b = this.clip[i]!;
    const f = Math.max(0, Math.min(1, (want - a.time) / Math.max(1e-6, b.time - a.time)));
    return blendViews(a, b, f);
  }

  clear(): void {
    this.frames = [];
    this.clip = [];
    this.goalAt = null;
    this.lastAt = -Infinity;
  }
}
