import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * Every fruit sound, built from noise and oscillators on the platform's
 * effects bus. `pan` runs from -1 (left) to 1 (right), so a slice on the
 * left of the screen sounds from the left speaker.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  /** A stereo position feeding the effects bus. It lets go of itself once the sound is over. */
  private at(pan: number, lifeS = 2): AudioNode {
    const panner = this.engine.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan * 0.8));
    panner.connect(this.engine.bus("sfx"));
    setTimeout(() => panner.disconnect(), lifeS * 1000);
    return panner;
  }

  /** Air cut by a fast blade. Faster swipes are louder and brighter. */
  whoosh(pan: number, speed: number): void {
    const out = this.at(pan);
    const k = Math.min(1, speed / 40);
    noise(this.engine, out, this.engine.now, { filter: "bandpass", frequency: 500, sweepTo: 2200 + k * 2500, q: 1.6, attack: 0.03, decay: 0.2, peak: 0.12 + k * 0.2 });
  }

  /** The juicy cut: a crisp slice, a wet squelch and a few drips. */
  slice(pan: number, size: number): void {
    const out = this.at(pan);
    const at = this.engine.now;
    noise(this.engine, out, at, { filter: "highpass", frequency: 2800, decay: 0.06, peak: 0.35 });
    noise(this.engine, out, at + 0.01, { filter: "lowpass", frequency: 900 - size * 250, sweepTo: 300, q: 3, decay: 0.16, peak: 0.55 });
    tone(this.engine, out, at, { type: "sine", frequency: 340 - size * 90, glideTo: 120, decay: 0.12, peak: 0.35 });
    for (let i = 0; i < 3; i++) {
      tone(this.engine, out, at + 0.05 + Math.random() * 0.12, { type: "sine", frequency: 900 + Math.random() * 700, glideTo: 1700, decay: 0.035, peak: 0.07 });
    }
  }

  /** A heavy fruit struck but not broken: a deep thunk with a knock on top. */
  thunk(pan: number): void {
    const out = this.at(pan);
    const at = this.engine.now;
    tone(this.engine, out, at, { type: "sine", frequency: 130, glideTo: 55, decay: 0.3, peak: 0.9 });
    tone(this.engine, out, at, { type: "triangle", frequency: 240, glideTo: 180, decay: 0.08, peak: 0.3 });
    noise(this.engine, out, at, { filter: "lowpass", frequency: 700, decay: 0.12, peak: 0.45 });
  }

  /** A big fruit finally bursting: a thunk and a splash. */
  burst(pan: number): void {
    this.thunk(pan);
    const out = this.at(pan, 3);
    const at = this.engine.now + 0.02;
    noise(this.engine, out, at, { filter: "lowpass", frequency: 1600, sweepTo: 250, q: 2, decay: 0.55, peak: 0.7 });
    for (let i = 0; i < 7; i++) {
      tone(this.engine, out, at + 0.06 + Math.random() * 0.4, { type: "sine", frequency: 700 + Math.random() * 900, glideTo: 1600, decay: 0.04, peak: 0.08 });
    }
  }

  /** A rare fruit: a bright bell arpeggio over a shimmer. */
  chime(pan: number): void {
    const out = this.at(pan, 3);
    const at = this.engine.now;
    [76, 83, 88, 95].forEach((note, i) => {
      const t = at + i * 0.07;
      tone(this.engine, out, t, { type: "sine", frequency: midi(note), decay: 1.1, peak: 0.16 });
      tone(this.engine, out, t, { type: "sine", frequency: midi(note) * 2.76, decay: 0.4, peak: 0.04 });
    });
    noise(this.engine, out, at, { filter: "highpass", frequency: 7000, attack: 0.05, decay: 0.9, peak: 0.08 });
  }

  /** Rising notes, one per fruit in the combo. */
  combo(count: number): void {
    const out = this.at(0);
    const at = this.engine.now;
    for (let i = 0; i < Math.min(count, 7); i++) {
      tone(this.engine, out, at + i * 0.06, { type: "triangle", frequency: midi(72 + i * 2), decay: 0.18, peak: 0.16 });
      tone(this.engine, out, at + i * 0.06, { type: "square", frequency: midi(84 + i * 2), decay: 0.06, peak: 0.03 });
    }
  }

  /** The bomb: a deep boom, a roar of noise and a crackle of debris. */
  explosion(pan: number): void {
    const out = this.at(pan, 4);
    const at = this.engine.now;
    tone(this.engine, out, at, { type: "sine", frequency: 90, glideTo: 28, decay: 1.1, peak: 1 });
    noise(this.engine, out, at, { filter: "lowpass", frequency: 1400, sweepTo: 120, q: 0.8, decay: 1.4, peak: 0.95 });
    noise(this.engine, out, at, { filter: "highpass", frequency: 2500, decay: 0.12, peak: 0.5 });
    for (let i = 0; i < 12; i++) {
      noise(this.engine, out, at + 0.1 + Math.random() * 0.7, { filter: "bandpass", frequency: 2000 + Math.random() * 3000, q: 4, decay: 0.03, peak: 0.15 });
    }
  }

  /** One beep per second of the countdown, and a brighter one for go. */
  count(go: boolean): void {
    const out = this.engine.bus("sfx");
    const at = this.engine.now;
    if (!go) {
      tone(this.engine, out, at, { type: "triangle", frequency: 880, decay: 0.16, peak: 0.25 });
      return;
    }
    for (const note of [84, 88, 91]) tone(this.engine, out, at, { type: "triangle", frequency: midi(note), decay: 0.5, peak: 0.18 });
    noise(this.engine, out, at, { filter: "bandpass", frequency: 800, sweepTo: 5000, q: 1, attack: 0.02, decay: 0.3, peak: 0.25 });
  }

  /** Time is up: a gong. */
  gong(): void {
    const out = this.engine.bus("sfx");
    const at = this.engine.now;
    for (const [f, peak, decay] of [
      [98, 0.5, 2.4],
      [196, 0.3, 2],
      [293, 0.18, 1.6],
      [415, 0.12, 1.2],
      [622, 0.08, 0.9],
    ] as const) {
      tone(this.engine, out, at, { type: "sine", frequency: f, attack: 0.01, decay, peak });
    }
    noise(this.engine, out, at, { filter: "bandpass", frequency: 400, q: 2, decay: 0.3, peak: 0.3 });
  }

  /** The winner's fanfare. */
  fanfare(): void {
    const out = this.engine.bus("sfx");
    const at = this.engine.now + 0.1;
    [72, 76, 79, 84, 79, 84].forEach((note, i) => {
      const t = at + i * (i < 3 ? 0.12 : 0.16);
      tone(this.engine, out, t, { type: "triangle", frequency: midi(note), decay: i === 5 ? 1 : 0.25, peak: 0.2 });
      tone(this.engine, out, t, { type: "sawtooth", frequency: midi(note - 12), decay: 0.2, peak: 0.04 });
    });
  }

  click(): void {
    tone(this.engine, this.engine.bus("ui"), this.engine.now, { type: "triangle", frequency: 1800, decay: 0.035, peak: 0.25 });
  }
}
