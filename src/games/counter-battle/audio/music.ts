import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { playStep } from "./band";
import type { Tune } from "./tunes";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one looping tune at a time with a lookahead scheduler: a timer
 * wakes often and books every note due in the next slice on the audio
 * clock, so the beat stays tight while the page is busy drawing. Tunes
 * crossfade through their own gain, so a switch never cuts a note. It
 * also plays the stings: a round won and the match's fanfare.
 */
export class Music {
  private current: { tune: Tune; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly warmth: BiquadFilterNode;

  constructor(private readonly engine: AudioEngine) {
    // Rolls off the top so the music sits under the gunfire and never bites.
    this.warmth = engine.ctx.createBiquadFilter();
    this.warmth.type = "lowpass";
    this.warmth.frequency.value = 3400;
    this.warmth.Q.value = 0.5;
    this.warmth.connect(engine.bus("music"));
  }

  play(tune: Tune | null): void {
    if (this.current?.tune === tune) return;
    // The same tune in another take picks up where the old one was, so the switch feels like a lift.
    const carry = this.current && tune && this.current.tune.hook === tune.hook ? this.current.step : 0;
    this.fadeOut();
    if (!tune) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, carry ? 0.1 : 0.4);
    gain.connect(this.warmth);
    this.current = { tune, gain, step: carry, nextAt: this.engine.now + 0.08 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** A round won: a rising three note call in the winner's register, over the loop. */
  roundSting(high: boolean): void {
    const at = this.engine.now + 0.03;
    const base = high ? 74 : 69;
    [0, 4, 7, 12].forEach((step, i) => {
      tone(this.engine, this.warmth, at + i * 0.09, { type: "square", frequency: midi(base + step), attack: 0.005, decay: 0.18, peak: 0.03 });
      tone(this.engine, this.warmth, at + i * 0.09, { type: "triangle", frequency: midi(base + step - 12), decay: 0.25, peak: 0.07 });
    });
  }

  /** The winner's fanfare: a call into a held major chord, with the loop stepping aside. */
  fanfare(): void {
    this.fadeOut();
    const out = this.warmth;
    const at = this.engine.now + 0.05;
    const beat = 0.15;
    const line: [number, number][] = [[0, 62], [1, 62], [2, 62], [3, 66], [5, 69], [6, 74]];
    for (const [b, note] of line) {
      tone(this.engine, out, at + b * beat, { type: "sawtooth", frequency: midi(note), attack: 0.01, decay: 0.2, peak: 0.025 });
      tone(this.engine, out, at + b * beat, { type: "triangle", frequency: midi(note - 12), decay: 0.25, peak: 0.08 });
    }
    const held = at + 7 * beat;
    for (const note of [62, 66, 69, 74, 78]) {
      tone(this.engine, out, held, { type: "triangle", frequency: midi(note), attack: 0.02, decay: 2.4, peak: 0.06 });
      tone(this.engine, out, held, { type: "sawtooth", frequency: midi(note), detune: 7, attack: 0.04, decay: 1.5, peak: 0.01 });
    }
    tone(this.engine, out, held, { frequency: midi(38), decay: 2.2, peak: 0.3 });
    noise(this.engine, out, held - 0.3, { filter: "highpass", frequency: 5000, attack: 0.3, decay: 1.8, peak: 0.09 });
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
    const stepLength = 60 / current.tune.bpm / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      playStep(this.engine, current.gain, current.tune, current.step, current.nextAt);
      current.step = (current.step + 1) % current.tune.hook.length;
      current.nextAt += stepLength;
    }
  }

  private fadeOut(): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.25);
    setTimeout(() => gain.disconnect(), 2000);
    this.current = null;
  }
}
