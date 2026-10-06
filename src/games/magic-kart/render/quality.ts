/** What the renderer may give up, step by step, to keep the frame rate. */
export interface QualityLevel {
  /** Share of the full drawing resolution. */
  resolution: number;
  /** Clear coat on the paint, the most costly part of the kart material. */
  clearcoat: boolean;
  /** Metres from the camera beyond which karts are drawn in their coarse cut. */
  farSwitch: number;
}

export const QUALITY_LEVELS: readonly QualityLevel[] = [
  { resolution: 1, clearcoat: true, farSwitch: 15 },
  { resolution: 0.85, clearcoat: true, farSwitch: 10 },
  { resolution: 0.85, clearcoat: false, farSwitch: 8 },
  { resolution: 0.72, clearcoat: false, farSwitch: 6 },
];

/** Frames slower than this, most of the time, mean the machine is struggling: below 50 a second. */
const SLOW_MS = 20;
/** Seconds of frames judged together, so one hitch never counts. */
const WINDOW_S = 2.5;
/** Seconds ignored after a new race, while shaders compile and the map settles. */
const SETTLE_S = 3;

/**
 * Keeps a race smooth on modest hardware. The renderer reports each
 * frame's time; when the middle of the last couple of seconds of frames
 * runs slower than 50 a second, it steps the quality down one level and
 * starts judging afresh. It never steps back up within a race, so the
 * picture does not flicker between levels. A player who capped the frame
 * rate below that is left alone.
 */
export class QualityGovernor {
  private level = 0;
  private frames: number[] = [];
  private elapsed = 0;
  private settle = SETTLE_S;

  /** `capFps` is the player's frame rate cap, null for none. */
  constructor(private readonly capFps: () => number | null = () => null) {}

  get current(): QualityLevel {
    return QUALITY_LEVELS[this.level]!;
  }

  /** A new race: settle again before judging, but keep what was learned about this machine. */
  restart(): void {
    this.frames = [];
    this.elapsed = 0;
    this.settle = SETTLE_S;
  }

  /** Reports one frame. Returns true when the level just changed. */
  sample(frameMs: number): boolean {
    const seconds = frameMs / 1000;
    if (this.settle > 0) {
      this.settle -= seconds;
      return false;
    }
    const cap = this.capFps();
    if (cap !== null && cap < 50) return false;
    if (this.level >= QUALITY_LEVELS.length - 1) return false;
    this.frames.push(frameMs);
    this.elapsed += seconds;
    if (this.elapsed < WINDOW_S) return false;
    const sorted = [...this.frames].sort((a, b) => a - b);
    const middle = sorted[Math.floor(sorted.length / 2)]!;
    this.frames = [];
    this.elapsed = 0;
    if (middle <= SLOW_MS) return false;
    this.level += 1;
    this.settle = 1;
    return true;
  }
}
