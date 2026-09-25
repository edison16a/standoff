import type { Stage } from "./stage";

/** Frames slower than this, for long enough, step the quality down. */
const SLOW_FRAME_S = 1 / 45;
/** Seconds of slow frames before stepping down, so one hiccup never costs quality. */
const SLOW_FOR_S = 2;
/**
 * Frames this quick leave room to spare. After a long run of them a
 * lowered quality is tried one step higher again, once per level, so a
 * hitch at the start (shaders compiling, another tab busy) is not a life
 * sentence.
 */
const QUICK_FRAME_S = 1 / 55;
const QUICK_FOR_S = 20;
/** The first seconds after the board appears build shaders and textures, so they never count as slow. */
const WARM_UP_S = 4;

/** A laptop that cannot keep up steps down in quality until it can, so the game stays smooth. */
export class QualityWatch {
  private slowFor = 0;
  private quickFor = 0;
  private lastFrameAt = 0;
  /** How often each level ran too slow. A level that failed twice is not tried again. */
  private readonly failed = new Map<number, number>();

  constructor(private readonly stage: Stage) {}

  /** Called once per drawn frame, with the game time so far. */
  frame(gameTime: number): void {
    const now = performance.now();
    const real = this.lastFrameAt ? (now - this.lastFrameAt) / 1000 : 0;
    this.lastFrameAt = now;
    // A long gap is a hidden tab or a breakpoint, not a slow machine.
    if (real > 3 || gameTime < WARM_UP_S) return;
    this.slowFor = real > SLOW_FRAME_S ? this.slowFor + real : Math.max(0, this.slowFor - real * 0.5);
    this.quickFor = real < QUICK_FRAME_S ? this.quickFor + real : 0;
    if (this.slowFor > SLOW_FOR_S) {
      const level = this.stage.qualityLevel;
      if (this.stage.lowerQuality()) this.failed.set(level, (this.failed.get(level) ?? 0) + 1);
      this.slowFor = 0;
      this.quickFor = 0;
    } else if (this.quickFor > QUICK_FOR_S && (this.failed.get(this.stage.qualityLevel - 1) ?? 0) < 2) {
      this.stage.raiseQuality();
      this.quickFor = 0;
    }
  }
}
