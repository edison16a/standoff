/** Frames kept per player. At 30 a second this is a third of a second, more than any take off. */
const KEEP = 12;
/** Head this close to its line, in shoulder widths, is standing. A jump starts where the head leaves it. */
const FLOOR = 0.03;
/** Rises smaller than this from frame to frame are the model's jitter, not the head going up. */
const JITTER = 0.004;
/** Never reach back further than this from the frame that saw the jump. */
const LOOK_BACK_MS = 160;

interface Sample {
  time: number;
  rise: number;
}

/**
 * Works out when a jump began. The camera only calls it a jump once the
 * head is clearly up, a frame or two into the rise. Walking back over
 * the last frames to where the head left its line gives the moment the
 * body went up, which is when the player meant the cube to jump. Pure,
 * so tests feed it made up heights.
 */
export class TakeoffTracker {
  private readonly frames: Sample[][];

  constructor(players: number) {
    this.frames = Array.from({ length: players }, () => []);
  }

  /** One camera frame: how far a player's head is above its line, in shoulder widths. */
  add(slot: number, time: number, rise: number): void {
    const list = this.frames[slot - 1];
    if (!list) return;
    list.push({ time, rise });
    if (list.length > KEEP) list.shift();
  }

  /** Forgets a player's frames, for when they step out of view. */
  clear(slot: number): void {
    this.frames[slot - 1]?.splice(0);
  }

  /** When the jump seen at `seenAt` left the ground, on the same clock. `seenAt` if nothing is known. */
  takeoff(slot: number, seenAt: number): number {
    const list = (this.frames[slot - 1] ?? []).filter((s) => s.time <= seenAt);
    let i = list.length - 1;
    if (i < 1) return seenAt;
    // Back while the head was still lower on each earlier frame and not yet down at its line.
    while (i > 0 && list[i]!.rise > FLOOR && list[i - 1]!.rise < list[i]!.rise - JITTER) i--;
    const low = list[i]!;
    const next = list[i + 1];
    let at = low.time;
    // Between the last frame at the line and the first above it, the head crossed the floor part way.
    if (next && low.rise < FLOOR && next.rise > FLOOR) at += ((FLOOR - low.rise) / (next.rise - low.rise)) * (next.time - low.time);
    return Math.max(at, seenAt - LOOK_BACK_MS);
  }
}
