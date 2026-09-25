import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { human } from "./band";

/**
 * The gun and the booth's own sounds, all synthesised. Each is layered
 * as a sharp front, a body and a short tail, and nudged in pitch every
 * time, so a round of rapid fire never sounds like one sample on repeat.
 * Sounds can be booked a little ahead on the audio clock, so the pump's
 * clicks land exactly on the frames where the pump moves.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** The BB gun: a crack of air, a low thump of the spring, and a short ring down the barrel. */
  pop(): void {
    const at = this.engine.now;
    const r = human(0.1);
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 2600 * r, attack: 0.001, decay: 0.018, peak: 0.38 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 800 * r, q: 1.1, attack: 0.001, decay: 0.08, peak: 0.3 });
    tone(this.engine, this.out, at, { frequency: 200 * r, glideTo: 60, attack: 0.001, decay: 0.1, peak: 0.34 });
    tone(this.engine, this.out, at + 0.004, { type: "triangle", frequency: 1250 * r, glideTo: 760 * r, decay: 0.07, peak: 0.05 });
    // The tail: the booth's canvas walls give a short dull bloom.
    noise(this.engine, this.out, at + 0.01, { filter: "lowpass", frequency: 1400, sweepTo: 400, attack: 0.01, decay: 0.22, peak: 0.07 });
  }

  /** Working the pump: a slide back, a click, and a slide home with a clack. */
  pump(delay = 0.1): void {
    const at = this.engine.now + delay;
    const r = human(0.08);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2600 * r, sweepTo: 1500 * r, q: 2, decay: 0.07, peak: 0.14 });
    noise(this.engine, this.out, at + 0.08, { filter: "highpass", frequency: 4200, decay: 0.018, peak: 0.28 });
    tone(this.engine, this.out, at + 0.08, { type: "square", frequency: 2300 * r, decay: 0.015, peak: 0.025 });
    noise(this.engine, this.out, at + 0.13, { filter: "bandpass", frequency: 1800 * r, sweepTo: 3000 * r, q: 2, decay: 0.06, peak: 0.12 });
    noise(this.engine, this.out, at + 0.2, { filter: "bandpass", frequency: 3200 * r, q: 3, decay: 0.03, peak: 0.28 });
    tone(this.engine, this.out, at + 0.2, { type: "triangle", frequency: 1250 * r, decay: 0.04, peak: 0.06 });
    tone(this.engine, this.out, at + 0.2, { frequency: 240 * r, glideTo: 150, decay: 0.05, peak: 0.08 });
  }

  /** A BB smacking into the cloth or wood behind: a small dull tap with a soft patter. */
  thud(delay = 0.06): void {
    const at = this.engine.now + delay;
    const r = human(0.2);
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 700 * r, attack: 0.001, decay: 0.05, peak: 0.34 });
    tone(this.engine, this.out, at, { frequency: 160 * r, glideTo: 90, decay: 0.06, peak: 0.18 });
    noise(this.engine, this.out, at + 0.03, { filter: "bandpass", frequency: 2200 * r, q: 2, decay: 0.04, peak: 0.03 });
  }

  /** A wood block tick for each second of the countdown and the last seconds of a round. */
  tick(high = false): void {
    const at = this.engine.now;
    const f = high ? 1760 : 1320;
    tone(this.engine, this.out, at, { type: "triangle", frequency: f, decay: 0.09, peak: 0.16 });
    tone(this.engine, this.out, at, { frequency: f / 2, decay: 0.05, peak: 0.1 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: f * 1.5, q: 4, decay: 0.02, peak: 0.1 });
  }

  /** The start: a bright bell struck twice, a fifth apart, over a cymbal swell. */
  go(): void {
    const at = this.engine.now;
    for (const [when, f] of [
      [0, 1047],
      [0.12, 1568],
    ] as const) {
      tone(this.engine, this.out, at + when, { frequency: f, decay: 0.7, peak: 0.12 });
      tone(this.engine, this.out, at + when, { frequency: f * 2.76, decay: 0.25, peak: 0.04 });
      tone(this.engine, this.out, at + when, { type: "triangle", frequency: f / 2, decay: 0.3, peak: 0.06 });
    }
    noise(this.engine, this.out, at + 0.12, { filter: "highpass", frequency: 6000, attack: 0.01, decay: 0.8, peak: 0.08 });
  }

  /** The end of the round: an old fashioned buzzer with a thump under it. */
  buzzer(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { type: "square", frequency: 146, attack: 0.01, decay: 1.1, peak: 0.12 });
    tone(this.engine, this.out, at, { type: "sawtooth", frequency: 148.5, attack: 0.01, decay: 1.1, peak: 0.08 });
    tone(this.engine, this.out, at, { type: "square", frequency: 293, attack: 0.01, decay: 0.9, peak: 0.03 });
    tone(this.engine, this.out, at, { frequency: 80, glideTo: 45, decay: 0.4, peak: 0.3 });
  }

  click(): void {
    const at = this.engine.now;
    const r = human(0.06);
    tone(this.engine, this.engine.bus("ui"), at, { type: "triangle", frequency: 1800 * r, decay: 0.035, peak: 0.22 });
    tone(this.engine, this.engine.bus("ui"), at, { frequency: 900 * r, decay: 0.05, peak: 0.12 });
  }
}
