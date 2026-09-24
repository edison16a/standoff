import type { AudioEngine } from "./audio-engine";
import { noise, tone } from "./voices";

/**
 * One shot effects. Each is fired straight off the game event that also
 * drives the animation, so the whoosh and the lunge start together.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** A sharp rising swish for a jab. */
  jab(): void {
    const at = this.engine.now;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 900, sweepTo: 4200, q: 1.4, attack: 0.02, decay: 0.16, peak: 0.55 });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 5000, attack: 0.01, decay: 0.08, peak: 0.15 });
  }

  /** A lighter, falling swish when a jab lands on nothing. */
  whiff(): void {
    const at = this.engine.now;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2600, sweepTo: 700, q: 1.1, attack: 0.01, decay: 0.2, peak: 0.22 });
  }

  /** Steel on steel: a bright strike plus a few inharmonic partials that ring. */
  clang(): void {
    const at = this.engine.now;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 3000, decay: 0.05, peak: 0.6 });
    for (const [frequency, peak, decay] of [
      [1870, 0.18, 0.7],
      [2553, 0.14, 0.55],
      [3411, 0.1, 0.45],
      [4987, 0.06, 0.3],
    ] as const) {
      tone(this.engine, this.out, at, { type: "sine", frequency, decay, peak });
    }
  }

  /** A body hit: low thump under a short crack. */
  impact(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { type: "sine", frequency: 150, glideTo: 55, decay: 0.28, peak: 0.9 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 1800, decay: 0.12, peak: 0.55 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 3200, q: 2, decay: 0.05, peak: 0.3 });
  }

  /** The starting signal: a short square buzz, like a real fencing box. */
  buzzer(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { type: "square", frequency: 440, attack: 0.005, decay: 0.45, peak: 0.12 });
    tone(this.engine, this.out, at, { type: "square", frequency: 443, attack: 0.005, decay: 0.45, peak: 0.08 });
  }

  /** A soft tick for each second of the countdown. */
  tick(): void {
    tone(this.engine, this.out, this.engine.now, { type: "triangle", frequency: 1320, decay: 0.07, peak: 0.12 });
  }

  /** Two note chime when a touch is scored, apart from the impact itself. */
  chime(): void {
    const at = this.engine.now + 0.12;
    tone(this.engine, this.out, at, { type: "triangle", frequency: 1047, decay: 0.5, peak: 0.16 });
    tone(this.engine, this.out, at + 0.11, { type: "triangle", frequency: 1568, decay: 0.7, peak: 0.16 });
  }

  /** A quiet click for interface actions, on its own bus. */
  click(): void {
    tone(this.engine, this.engine.bus("ui"), this.engine.now, { type: "triangle", frequency: 1800, decay: 0.035, peak: 0.25 });
  }
}
