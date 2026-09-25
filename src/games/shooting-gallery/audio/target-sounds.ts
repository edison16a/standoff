import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { human } from "./band";

/** Partials of a small brass bell, as ratio, decay and share of the level. */
const BELL = [
  [1, 0.9, 1],
  [2.76, 0.4, 0.35],
  [5.4, 0.18, 0.15],
] as const;

/** A major pentatonic run up from C6, so a streak of hits climbs a tune rather than a siren. */
const STREAK = [84, 86, 88, 91, 93, 96];

/**
 * What the targets sound like when struck: a bell that climbs with each
 * hit in a row, a rubber duck's squeak, the golden duck's sparkle, and
 * the wooden clack or steel clang when a target lands.
 */
export class TargetSounds {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** A struck bell on a bullseye or plate. `streak` counts hits in a row, raising the note. */
  ding(bull: boolean, streak: number, delay = 0.06): void {
    const at = this.engine.now + delay;
    const note = STREAK[Math.min(streak, STREAK.length - 1)]!;
    // The knock of the pellet on the face, then the ring.
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 3000, q: 1.5, attack: 0.001, decay: 0.02, peak: 0.2 });
    this.strike(at, midi(note - 5), 0.2);
    if (bull) {
      this.strike(at + 0.1, midi(note + 2), 0.18);
      this.strike(at + 0.2, midi(note + 7), 0.16);
    }
  }

  /** A rubber duck's squeak: air through a reed, pitch up then down, twice. */
  quack(pitch = 1, delay = 0.06): void {
    const at = this.engine.now + delay;
    const p = pitch * human(0.1);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1800, q: 1.4, attack: 0.001, decay: 0.03, peak: 0.18 });
    this.squeak(at + 0.01, 820 * p, 0.13);
    this.squeak(at + 0.15, 700 * p, 0.17);
  }

  /** A golden duck: the squeak, then a shower of rising sparkles with a shimmer under them. */
  golden(delay = 0.06): void {
    this.quack(1.15, delay);
    const at = this.engine.now + delay + 0.1;
    [84, 88, 91, 96, 100].forEach((note, i) => {
      tone(this.engine, this.out, at + i * 0.055, { type: "triangle", frequency: midi(note), decay: 0.4, peak: 0.07 });
      tone(this.engine, this.out, at + i * 0.055, { frequency: midi(note + 12), decay: 0.2, peak: 0.03 });
    });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 7000, attack: 0.05, decay: 0.9, peak: 0.06 });
  }

  /** Something knocked flat hitting its stop: wood for ducks and bullseyes, steel for plates. */
  clack(steel: boolean): void {
    const at = this.engine.now;
    const r = human(0.12);
    if (steel) {
      for (const [frequency, peak] of [
        [1210, 0.07],
        [1860, 0.05],
        [2750, 0.035],
      ] as const) {
        tone(this.engine, this.out, at, { frequency: frequency * r, decay: 0.4, peak });
      }
      noise(this.engine, this.out, at, { filter: "highpass", frequency: 3000, decay: 0.03, peak: 0.2 });
      return;
    }
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1100 * r, q: 2.2, decay: 0.05, peak: 0.5 });
    tone(this.engine, this.out, at, { type: "triangle", frequency: 330 * r, glideTo: 190, decay: 0.07, peak: 0.26 });
    // A little rattle as it settles against its stop.
    noise(this.engine, this.out, at + 0.07, { filter: "bandpass", frequency: 1500 * r, q: 3, decay: 0.03, peak: 0.12 });
  }

  private strike(at: number, frequency: number, peak: number): void {
    for (const [ratio, decay, share] of BELL) {
      tone(this.engine, this.out, at, { frequency: frequency * ratio, decay, peak: peak * share });
    }
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
    gain.gain.linearRampToValueAtTime(0.45, at + 0.015);
    gain.gain.setValueAtTime(0.4, at + length * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(filter).connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + length + 0.05);
    osc.onended = () => gain.disconnect();
  }
}
