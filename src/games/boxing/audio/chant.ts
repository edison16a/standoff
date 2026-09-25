import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { CrowdSound } from "./crowd";

/**
 * The arena chanting together: a two syllable name chant on a stomp
 * ("RO! co!") and the stadium clap ("clap clap, clap clap clap, HEY!").
 * The voices are the crowd's own, cut short and in time, with every
 * stomp and clap made of many small hits, so it sounds like thousands.
 */
export class Chant {
  private busyUntil = 0;

  constructor(
    private readonly engine: AudioEngine,
    private readonly crowd: CrowdSound,
  ) {}

  private get out(): AudioNode {
    return this.engine.bus("crowd");
  }

  /** True while a chant is still going, so two never overlap. */
  get busy(): boolean {
    return this.engine.now < this.busyUntil;
  }

  /** "RO! co!" four times over, a stomp and a clap under each syllable. */
  name(amount: number): void {
    if (this.busy) return;
    const start = this.engine.now + 0.05;
    const bar = 1.25;
    for (let i = 0; i < 4; i++) {
      const at = start + i * bar;
      // Builds a little each time, the way a chant catches on.
      const level = amount * (0.7 + i * 0.1);
      this.crowd.voices(level, 240, 1.05, 0.3, [720, 1150], at, 0.1);
      this.crowd.voices(level * 0.9, 210, 0.92, 0.42, [480, 900], at + 0.34, 0.1);
      this.stomp(at, level);
      this.stomp(at + 0.34, level * 0.8);
    }
    this.busyUntil = start + bar * 4;
  }

  /** The stadium clap and a shout on the end. */
  claps(amount: number): void {
    if (this.busy) return;
    const start = this.engine.now + 0.05;
    const beat = 0.3;
    const pattern = [0, 1, 2.5, 3, 3.5];
    for (let round = 0; round < 2; round++) {
      const at = start + round * beat * 6;
      for (const b of pattern) this.clap(at + b * beat, amount);
      this.crowd.voices(amount, 260, 1.15, 0.45, [760, 1250], at + 4.5 * beat, 0.1);
    }
    this.busyUntil = start + beat * 12;
  }

  /** Thousands of feet on the stands: a deep thud with a wooden knock on top. */
  private stomp(at: number, amount: number): void {
    tone(this.engine, this.out, at, { frequency: 70, glideTo: 45, attack: 0.01, decay: 0.2, peak: 0.25 * amount });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 350, attack: 0.012, decay: 0.15, peak: 0.25 * amount });
  }

  /** One clap from the whole arena: many hands, each a hair early or late. */
  private clap(at: number, amount: number): void {
    for (let i = 0; i < 14; i++) {
      noise(this.engine, this.out, at + Math.random() * 0.035, {
        filter: "bandpass",
        frequency: 900 + Math.random() * 1600,
        q: 1.4,
        attack: 0.001,
        decay: 0.03 + Math.random() * 0.03,
        peak: (0.06 + Math.random() * 0.08) * amount,
      });
    }
  }
}
