import type { AudioEngine } from "@/platform/audio/audio-engine";

/** A piece of music as a loop of sixteenth note steps. */
export interface Loop {
  bpm: number;
  steps: number;
  /** How late the offbeat sixteenths land, as a share of a sixteenth. */
  swing: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one loop at a time with a lookahead scheduler: a timer wakes
 * often and books every note due in the next slice on the audio clock,
 * so the beat stays tight while the page is busy drawing. Loops fade
 * through their own gain, so a switch never cuts a note, and everything
 * passes a low pass filter so nothing in the music is ever harsh.
 */
export class LoopMusic {
  private current: { loop: Loop; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly tone: BiquadFilterNode;

  constructor(private readonly engine: AudioEngine, cutoffHz: number) {
    this.tone = engine.ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = cutoffHz;
    this.tone.Q.value = 0.5;
    this.tone.connect(engine.bus("music"));
  }

  get playing(): Loop | null {
    return this.current?.loop ?? null;
  }

  play(loop: Loop | null, fadeS = 0.8): void {
    if (this.current?.loop === loop) return;
    this.fadeOut(0.4);
    if (!loop) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, fadeS / 3);
    gain.connect(this.tone);
    this.current = { loop, gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const sixteenth = 60 / current.loop.bpm / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      const swing = current.step % 2 === 1 ? current.loop.swing * sixteenth : 0;
      current.loop.play(this.engine, current.gain, current.step, current.nextAt + swing);
      current.step = (current.step + 1) % current.loop.steps;
      current.nextAt += sixteenth;
    }
  }

  private fadeOut(fadeS: number): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.cancelScheduledValues(this.engine.now);
    gain.gain.setTargetAtTime(0.0001, this.engine.now, fadeS / 3);
    setTimeout(() => gain.disconnect(), fadeS * 1000 + 1500);
    this.current = null;
  }
}
