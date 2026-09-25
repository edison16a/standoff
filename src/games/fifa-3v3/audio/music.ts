import type { AudioEngine } from "@/platform/audio/audio-engine";
import { playStep } from "./band";
import { fanfare, goalSting } from "./stings";
import { TUNES, type TuneName } from "./tunes";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one looping tune at a time with the usual lookahead scheduler:
 * a timer wakes often and books every note due in the next slice on the
 * audio clock, so the beat stays tight while the page is busy drawing.
 * Tunes crossfade through their own gain so a switch never cuts a note.
 */
export class Music {
  private current: { name: TuneName; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly warmth: BiquadFilterNode;

  constructor(private readonly engine: AudioEngine) {
    // Rolls off the top so the band sounds like a radio on the terraces, never harsh.
    this.warmth = engine.ctx.createBiquadFilter();
    this.warmth.type = "lowpass";
    this.warmth.frequency.value = 2800;
    this.warmth.Q.value = 0.5;
    this.warmth.connect(engine.bus("music"));
  }

  play(name: TuneName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    if (!name) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.5);
    gain.connect(this.warmth);
    this.current = { name, gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** The winners' fanfare, with the loop stepping aside for it. */
  fanfare(): void {
    this.dip(0.1, 4);
    fanfare(this.engine, this.warmth);
  }

  /** A rising brass sting for a goal. */
  goalSting(): void {
    this.dip(0.2, 2.5);
    goalSting(this.engine, this.warmth);
  }

  /**
   * Lowers just the loop, not the whole music bus, so a sting on top of
   * it is heard in full and never clashes with the chords underneath.
   */
  private dip(amount: number, holdS: number): void {
    const gain = this.current?.gain.gain;
    if (!gain) return;
    const now = this.engine.now;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(amount, now, 0.08);
    gain.setTargetAtTime(1, now + holdS, 0.6);
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    setTimeout(() => this.warmth.disconnect(), 2500);
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const tune = TUNES[current.name];
    const stepLength = 60 / tune.bpm / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      playStep(this.engine, current.gain, tune, current.step, current.nextAt);
      current.step = (current.step + 1) % tune.hook.length;
      current.nextAt += stepLength;
    }
  }

  private fadeOut(): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.3);
    setTimeout(() => gain.disconnect(), 2000);
    this.current = null;
  }
}
