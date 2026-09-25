import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;
const BPM = 92;

/** A laid back boom bap loop: kick, snare, hats, a walking bass and a chord stab. 16 steps a bar, 4 bars. */
const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
const BASS = [38, 38, 41, 43];
const CHORDS = [[62, 65, 69], [62, 65, 69], [65, 69, 72], [67, 70, 74]];

/**
 * The lobby and results music: a hip hop beat played with the usual
 * lookahead scheduler, so it stays tight while the page is busy drawing.
 * During play the building is left to the crowd.
 */
export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private gain: GainNode | null = null;
  private step = 0;
  private nextAt = 0;

  constructor(private readonly engine: AudioEngine) {}

  play(on: boolean): void {
    if (on === (this.gain !== null)) return;
    if (!on) return this.fadeOut();
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(0.9, this.engine.now, 0.4);
    gain.connect(this.engine.bus("music"));
    this.gain = gain;
    this.step = 0;
    this.nextAt = this.engine.now + 0.1;
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** A brass fanfare for the winners. */
  fanfare(): void {
    const out = this.engine.bus("music");
    const at = this.engine.now + 0.05;
    [60, 64, 67, 72].forEach((n, i) => {
      tone(this.engine, out, at + i * 0.12, { type: "sawtooth", frequency: midi(n), attack: 0.02, decay: 0.3, peak: 0.08 });
      tone(this.engine, out, at + i * 0.12, { type: "square", frequency: midi(n + 12), attack: 0.02, decay: 0.25, peak: 0.03 });
    });
    for (const n of [60, 64, 67, 72, 76]) tone(this.engine, out, at + 0.55, { type: "sawtooth", frequency: midi(n), attack: 0.05, decay: 1.8, peak: 0.05 });
    noise(this.engine, out, at + 0.55, { filter: "highpass", frequency: 5000, decay: 1.4, peak: 0.12 });
  }

  /** The arena organ's rising "charge" riff, for dead balls. */
  organ(): void {
    const out = this.engine.bus("music");
    const at = this.engine.now + 0.05;
    [55, 60, 64, 67, 64, 67].forEach((n, i) => {
      const len = i === 5 ? 0.6 : 0.16;
      for (const h of [0, 12]) tone(this.engine, out, at + i * 0.17, { type: "square", frequency: midi(n + h), attack: 0.01, decay: len, peak: 0.035 });
    });
  }

  stop(): void {
    this.fadeOut();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private fadeOut(): void {
    const gain = this.gain;
    if (!gain) return;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.3);
    setTimeout(() => gain.disconnect(), 2000);
    this.gain = null;
  }

  private schedule(): void {
    const out = this.gain;
    if (!out) return;
    const stepLength = 60 / BPM / 4;
    if (this.nextAt < this.engine.now - 0.5) this.nextAt = this.engine.now + 0.05;
    while (this.nextAt < this.engine.now + LOOKAHEAD_S) {
      this.beat(out, this.step, this.nextAt);
      this.step = (this.step + 1) % 64;
      this.nextAt += stepLength;
    }
  }

  private beat(out: AudioNode, step: number, at: number): void {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    // A lazy swing: every other sixteenth lands a touch late.
    const t = at + (s % 2 === 1 ? 0.03 : 0);
    if (KICK[s]) tone(this.engine, out, t, { type: "sine", frequency: 140, glideTo: 42, decay: 0.32, peak: 0.55 });
    if (SNARE[s]) {
      noise(this.engine, out, t, { filter: "bandpass", frequency: 1900, q: 0.7, decay: 0.16, peak: 0.28 });
      tone(this.engine, out, t, { type: "triangle", frequency: 190, glideTo: 150, decay: 0.08, peak: 0.12 });
    }
    if (s % 2 === 0) noise(this.engine, out, t, { filter: "highpass", frequency: 7500, decay: s % 4 === 2 ? 0.07 : 0.03, peak: 0.06 });
    if (s === 0 || s === 6 || s === 10) tone(this.engine, out, t, { type: "sawtooth", frequency: midi(BASS[bar]! + (s === 10 ? 7 : 0)), decay: 0.28, peak: 0.07 });
    if (s === 2 || s === 11) for (const n of CHORDS[bar]!) tone(this.engine, out, t, { type: "triangle", frequency: midi(n), attack: 0.01, decay: 0.35, peak: 0.028 });
  }
}
