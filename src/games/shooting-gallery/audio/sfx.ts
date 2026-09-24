import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

/**
 * The gallery's one shot sounds, all synthesised. Each can be booked a
 * little ahead on the audio clock, so the pump's clicks land exactly on
 * the frames where the pump moves.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** The BB gun: a dry pop of air with a low thump and a hint of spring. */
  pop(): void {
    const at = this.engine.now;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 1400, decay: 0.05, peak: 0.55 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 700, q: 1.2, decay: 0.09, peak: 0.35 });
    tone(this.engine, this.out, at, { type: "sine", frequency: 190, glideTo: 70, decay: 0.09, peak: 0.45 });
    tone(this.engine, this.out, at + 0.005, { type: "triangle", frequency: 1100, glideTo: 700, decay: 0.05, peak: 0.05 });
  }

  /** Working the pump: a slide back, a click, and a slide home with a clack. */
  pump(delay = 0.1): void {
    const at = this.engine.now + delay;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2600, sweepTo: 1500, q: 2, decay: 0.07, peak: 0.16 });
    noise(this.engine, this.out, at + 0.08, { filter: "highpass", frequency: 4200, decay: 0.018, peak: 0.32 });
    tone(this.engine, this.out, at + 0.08, { type: "square", frequency: 2300, decay: 0.015, peak: 0.03 });
    noise(this.engine, this.out, at + 0.13, { filter: "bandpass", frequency: 1800, sweepTo: 3000, q: 2, decay: 0.06, peak: 0.14 });
    noise(this.engine, this.out, at + 0.2, { filter: "bandpass", frequency: 3200, q: 3, decay: 0.03, peak: 0.3 });
    tone(this.engine, this.out, at + 0.2, { type: "triangle", frequency: 1250, decay: 0.03, peak: 0.06 });
  }

  /** A bright bell when a bullseye or plate is struck. The bull rings twice, higher. */
  ding(bull: boolean, delay = 0.06): void {
    const at = this.engine.now + delay;
    const base = bull ? 1760 : 1318;
    const strike = (when: number, frequency: number, peak: number) => {
      for (const [ratio, decay, share] of [
        [1, 0.9, 1],
        [2.76, 0.4, 0.35],
        [5.4, 0.18, 0.15],
      ] as const) {
        tone(this.engine, this.out, when, { type: "sine", frequency: frequency * ratio, decay, peak: peak * share });
      }
    };
    strike(at, base, 0.22);
    if (bull) strike(at + 0.11, base * 1.5, 0.2);
  }

  /** A rubber duck's squeak: air through a reed, pitch up then down, twice. */
  quack(pitch = 1, delay = 0.06): void {
    const at = this.engine.now + delay;
    this.squeak(at, 820 * pitch, 0.13);
    this.squeak(at + 0.14, 700 * pitch, 0.16);
  }

  /** A golden duck: the squeak, then a sparkle of rising notes. */
  golden(delay = 0.06): void {
    this.quack(1.15, delay);
    const at = this.engine.now + delay + 0.1;
    [2093, 2637, 3136, 4186].forEach((frequency, i) => {
      tone(this.engine, this.out, at + i * 0.06, { type: "triangle", frequency, decay: 0.35, peak: 0.07 });
    });
  }

  /** Something knocked flat hitting its stop: wood for ducks and bullseyes, steel for plates. */
  clack(steel: boolean): void {
    const at = this.engine.now;
    if (steel) {
      for (const [frequency, peak] of [
        [1210, 0.07],
        [1860, 0.05],
        [2750, 0.035],
      ] as const) {
        tone(this.engine, this.out, at, { type: "sine", frequency, decay: 0.35, peak });
      }
      noise(this.engine, this.out, at, { filter: "highpass", frequency: 3000, decay: 0.03, peak: 0.2 });
      return;
    }
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1100, q: 2.2, decay: 0.05, peak: 0.55 });
    tone(this.engine, this.out, at, { type: "triangle", frequency: 330, glideTo: 190, decay: 0.07, peak: 0.28 });
  }

  /** A BB smacking into the cloth or wood behind: a small dull tap. */
  thud(delay = 0.06): void {
    noise(this.engine, this.out, this.engine.now + delay, { filter: "lowpass", frequency: 700, decay: 0.04, peak: 0.18 });
  }

  /** A tick for each second of the countdown and the last seconds of a round. */
  tick(high = false): void {
    tone(this.engine, this.out, this.engine.now, { type: "triangle", frequency: high ? 1760 : 1320, decay: 0.08, peak: 0.16 });
  }

  /** Two quick rising notes at the start of shooting. */
  go(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { type: "square", frequency: 880, decay: 0.12, peak: 0.07 });
    tone(this.engine, this.out, at + 0.1, { type: "square", frequency: 1320, decay: 0.3, peak: 0.08 });
  }

  /** The end of the round: an old fashioned buzzer. */
  buzzer(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { type: "square", frequency: 146, attack: 0.01, decay: 1.1, peak: 0.14 });
    tone(this.engine, this.out, at, { type: "sawtooth", frequency: 148.5, attack: 0.01, decay: 1.1, peak: 0.1 });
    tone(this.engine, this.out, at, { type: "square", frequency: 293, attack: 0.01, decay: 0.9, peak: 0.04 });
  }

  click(): void {
    tone(this.engine, this.engine.bus("ui"), this.engine.now, { type: "triangle", frequency: 1800, decay: 0.035, peak: 0.25 });
  }

  private squeak(at: number, frequency: number, length: number): void {
    const { ctx } = this.engine;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency * 0.8, at);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.45, at + length * 0.35);
    osc.frequency.exponentialRampToValueAtTime(frequency, at + length);
    filter.type = "bandpass";
    filter.frequency.value = frequency * 2;
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.32, at + 0.015);
    gain.gain.setValueAtTime(0.28, at + length * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(filter).connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + length + 0.05);
    osc.onended = () => gain.disconnect();
  }
}
