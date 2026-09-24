import type { GameEvent } from "../events";
import type { SceneFrame } from "../frames";

/** How much history we keep. The replay only ever needs the last few seconds. */
const KEEP_MS = 6000;

/**
 * Remembers recent frames and events while play is live. Frames are small
 * plain objects, so a few seconds of them cost next to nothing, and there
 * is no video to capture: a replay is these frames drawn again.
 */
export class Recorder {
  private frames: SceneFrame[] = [];
  private events: GameEvent[] = [];

  record(frame: SceneFrame): void {
    this.frames.push(frame);
    const cutoff = frame.t - KEEP_MS;
    while (this.frames.length > 0 && this.frames[0]!.t < cutoff) this.frames.shift();
    while (this.events.length > 0 && this.events[0]!.t < cutoff) this.events.shift();
  }

  note(event: GameEvent): void {
    this.events.push(event);
  }

  /** The most recent event of a type, like the touch a replay centres on. */
  last<T extends GameEvent["type"]>(type: T): Extract<GameEvent, { type: T }> | undefined {
    return this.events.findLast((event): event is Extract<GameEvent, { type: T }> => event.type === type);
  }

  clear(): void {
    this.frames = [];
    this.events = [];
  }

  /** Copies out everything between two times, for a replay to own. */
  slice(from: number, to: number): { frames: SceneFrame[]; events: GameEvent[] } {
    return {
      frames: this.frames.filter((frame) => frame.t >= from && frame.t <= to),
      events: this.events.filter((event) => event.t >= from && event.t <= to),
    };
  }
}
