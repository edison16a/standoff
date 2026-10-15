import type { MatchEvent } from "../../engine/events";
import type { MatchView } from "../../engine/view";
import { replays, type Cue } from "./cues";

/** Long enough for a snap, a deep throw and the run after the catch. */
const KEEP_S = 16;

/**
 * Keeps the last few seconds of match stills, one every step, and the
 * sounds of the play with them, so a replay shows every body exactly as
 * it moved and hears the pads as they popped. Old stills are dropped
 * from the front in batches, which is cheaper than one at a time on a
 * long list.
 */
export class ReplayRecorder {
  private frames: MatchView[] = [];
  private sounds: Cue[] = [];

  record(view: MatchView, events: readonly MatchEvent[] = []): void {
    this.frames.push(view);
    for (const event of events) if (replays(event)) this.sounds.push({ time: view.time, event });
    const first = this.frames[0]!;
    if (view.time - first.time <= KEEP_S + 1) return;
    const old = this.frames.findIndex((f) => view.time - f.time <= KEEP_S);
    if (old > 0) this.frames.splice(0, old);
    const cutoff = this.frames[0]!.time;
    this.sounds = this.sounds.filter((c) => c.time >= cutoff);
  }

  /** Every still kept, oldest first. */
  get all(): readonly MatchView[] {
    return this.frames;
  }

  /** The sounds of the stills kept, oldest first. */
  get cues(): readonly Cue[] {
    return this.sounds;
  }

  clear(): void {
    this.frames = [];
    this.sounds = [];
  }
}
