import type { MatchView } from "../../engine/view";

/** Long enough for a snap, a deep throw and the run after the catch. */
const KEEP_S = 16;

/**
 * Keeps the last few seconds of match stills, one every step, so the
 * deep slow motion of the throw blends between close frames. Old stills
 * are dropped from the front in batches, which is cheaper than one at a
 * time on a long list.
 */
export class ReplayRecorder {
  private frames: MatchView[] = [];

  record(view: MatchView): void {
    this.frames.push(view);
    const first = this.frames[0]!;
    if (view.time - first.time <= KEEP_S + 1) return;
    const old = this.frames.findIndex((f) => view.time - f.time <= KEEP_S);
    if (old > 0) this.frames.splice(0, old);
  }

  /** Every still kept, oldest first. */
  get all(): readonly MatchView[] {
    return this.frames;
  }

  clear(): void {
    this.frames = [];
  }
}
