import type { AudioEngine } from "@/platform/audio/audio-engine";
import { fanfare } from "./band";
import { playStep, SIXTEENTH, STEPS } from "./tune";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/** How loud the tune sits for each part of the game. In a fight it is a bed under the crowd. */
const LEVELS = { menu: 0.85, fight: 0.3, results: 0.7 } as const;
export type MusicMood = keyof typeof LEVELS;

/**
 * Loops the gym tune with a lookahead scheduler: a timer wakes often and
 * books every sixteenth due in the next slice on the audio clock, so the
 * groove holds while the arena is drawing. The tune never restarts
 * between screens; it only rises and falls, so moving on never cuts it.
 */
export class Music {
  private readonly level: GainNode;
  private readonly out: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextAt = 0;

  constructor(private readonly engine: AudioEngine) {
    const { ctx } = engine;
    // Rolls off the top so the horns stay warm and the crowd owns the highs.
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 2400;
    warmth.Q.value = 0.5;
    this.level = ctx.createGain();
    this.level.gain.value = 0.0001;
    this.out = ctx.createGain();
    this.out.connect(this.level).connect(warmth).connect(engine.bus("music"));
  }

  /** Starts the loop if it is not running, and eases to the level for this part of the game. */
  play(mood: MusicMood): void {
    this.level.gain.cancelScheduledValues(this.engine.now);
    this.level.gain.setTargetAtTime(LEVELS[mood], this.engine.now, 0.6);
    if (this.timer) return;
    this.step = 0;
    this.nextAt = this.engine.now + 0.1;
    this.timer = setInterval(() => this.schedule(), WAKE_MS);
  }

  fanfare(): void {
    fanfare(this.engine, this.out);
  }

  stop(): void {
    this.level.gain.setTargetAtTime(0.0001, this.engine.now, 0.2);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    // A tab left in the background would otherwise play every missed step at once.
    if (this.nextAt < this.engine.now - 0.5) this.nextAt = this.engine.now + 0.05;
    while (this.nextAt < this.engine.now + LOOKAHEAD_S) {
      playStep(this.engine, this.out, this.step, this.nextAt);
      this.step = (this.step + 1) % STEPS;
      this.nextAt += SIXTEENTH;
    }
  }
}
