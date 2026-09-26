import type { AudioEngine } from "@/platform/audio/audio-engine";
import { handClap, stompKick } from "./arena-voices";

/** The classic arena chant tempo: slow enough to stomp along to. */
const BPM = 84;
/** One bar in eighths: stomp, stomp, clap, rest, twice. */
const PATTERN = ["kick", "kick", "clap", null, "kick", "kick", "clap", null] as const;
const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * The stomp stomp clap the building plays on a dead ball: a punchy kick
 * twice, then a sharp clap, looped for a few bars. It uses the same
 * lookahead scheduler as the music so it stays tight while the page is
 * busy drawing, and it stops the moment play is live again.
 */
export class ArenaBeat {
  private timer: ReturnType<typeof setInterval> | null = null;
  private gain: GainNode | null = null;
  private step = 0;
  private nextAt = 0;
  private stepsLeft = 0;

  constructor(
    private readonly engine: AudioEngine,
    private readonly out: AudioNode,
    private readonly wet: AudioNode,
  ) {}

  get playing(): boolean {
    return this.timer !== null;
  }

  /** Starts the loop for `bars`, or keeps a running one going that long from now. */
  start(bars: number, delayS = 0): void {
    this.stepsLeft = Math.max(this.stepsLeft, bars * PATTERN.length);
    if (this.timer) return;
    const gain = this.engine.ctx.createGain();
    gain.connect(this.out);
    this.gain = gain;
    this.step = 0;
    this.nextAt = this.engine.now + 0.05 + delayS;
    this.timer = setInterval(() => this.schedule(), WAKE_MS);
  }

  /** Stops booking new hits and fades anything already booked, so it never cuts a clap in half. */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stepsLeft = 0;
    const gain = this.gain;
    if (!gain) return;
    this.gain = null;
    gain.gain.setTargetAtTime(0, this.engine.now, 0.05);
    setTimeout(() => gain.disconnect(), 600);
  }

  private schedule(): void {
    const gain = this.gain;
    if (!gain) return;
    const eighth = 60 / BPM / 2;
    // A stalled tab would otherwise try to catch up on every missed hit at once.
    if (this.nextAt < this.engine.now - 0.3) this.nextAt = this.engine.now + 0.05;
    while (this.nextAt < this.engine.now + LOOKAHEAD_S) {
      if (this.stepsLeft <= 0) return this.finish();
      const hit = PATTERN[this.step % PATTERN.length];
      // The second stomp lands a touch softer, the way feet do.
      if (hit === "kick") stompKick(this.engine, gain, this.nextAt, this.step % 2 === 0 ? 0.85 : 0.72);
      else if (hit === "clap") handClap(this.engine, gain, this.wet, this.nextAt, 0.55);
      this.step++;
      this.stepsLeft--;
      this.nextAt += eighth;
    }
  }

  /** Ran its bars out: let the last hits ring and release the node. */
  private finish(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const gain = this.gain;
    this.gain = null;
    if (gain) setTimeout(() => gain.disconnect(), 1000);
  }
}
