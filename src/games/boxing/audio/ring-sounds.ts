import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

/** Partials of a brass ring bell, as ratios of its note. They are not whole numbers, which is what makes it sound like metal. */
const BELL = [
  [1, 0.5, 2.4],
  [2.76, 0.28, 1.6],
  [5.4, 0.16, 1.0],
  [8.93, 0.08, 0.6],
  [0.5, 0.12, 1.8],
] as const;

/**
 * The ring's own sounds: the bell, the timekeeper's clapper at ten
 * seconds to go, and the referee's count, each number shouted over the
 * slap of his hand on the canvas.
 */
export class RingSounds {
  constructor(private readonly engine: AudioEngine) {}

  /** One strike of the bell. */
  ding(at = this.engine.now + 0.005, level = 1): void {
    const out = this.engine.bus("sfx");
    for (const [ratio, peak, decay] of BELL) {
      tone(this.engine, out, at, { type: "sine", frequency: 830 * ratio, attack: 0.002, decay, peak: peak * 0.5 * level });
    }
    noise(this.engine, out, at, { filter: "highpass", frequency: 4000, attack: 0.001, decay: 0.03, peak: 0.2 * level });
  }

  /** Three quick strikes to start a round, a single long one to end it, and a flurry at the final bell. */
  bell(kind: "start" | "end" | "final"): void {
    const now = this.engine.now + 0.005;
    const strikes = kind === "start" ? 3 : kind === "final" ? 5 : 1;
    for (let i = 0; i < strikes; i++) this.ding(now + i * (kind === "final" ? 0.22 : 0.3), i === 0 ? 1 : 0.85);
  }

  /** The timekeeper banging the ring apron: ten seconds left. */
  clapper(): void {
    const out = this.engine.bus("sfx");
    for (let i = 0; i < 3; i++) {
      const at = this.engine.now + 0.005 + i * 0.16;
      noise(this.engine, out, at, { filter: "bandpass", frequency: 1400, q: 4, attack: 0.001, decay: 0.06, peak: 0.6 });
      tone(this.engine, out, at, { type: "square", frequency: 620, glideTo: 480, attack: 0.001, decay: 0.05, peak: 0.08 });
    }
  }

  /**
   * One number of the count: the hand slapping the canvas and a shouted
   * syllable. Nobody can mistake a count for anything else, and it gets
   * more urgent as it climbs.
   */
  count(n: number): void {
    const out = this.engine.bus("sfx");
    const at = this.engine.now + 0.005;
    noise(this.engine, out, at, { filter: "bandpass", frequency: 900, q: 1.2, attack: 0.001, decay: 0.08, peak: 0.7 });
    tone(this.engine, out, at, { type: "sine", frequency: 120, glideTo: 60, attack: 0.002, decay: 0.12, peak: 0.5 });
    this.shout(at + 0.06, 150 + n * 6, n >= 8 ? 1.2 : 1);
  }

  /** "Out!": the tenth count, lower and longer. */
  out(): void {
    const at = this.engine.now + 0.005;
    this.shout(at, 120, 1.5, 0.55);
    this.ding(at + 0.3, 0.9);
    this.ding(at + 0.55, 0.9);
  }

  /** A shouted vowel: a buzzy voice through the formants of "ah". */
  private shout(at: number, pitch: number, level: number, seconds = 0.26): void {
    const { ctx } = this.engine;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(pitch * 1.15, at);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.85, at + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.22 * level, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    gain.connect(this.engine.bus("sfx"));
    for (const [frequency, q] of [
      [730, 6],
      [1090, 8],
      [2440, 10],
    ] as const) {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = frequency;
      f.Q.value = q;
      osc.connect(f).connect(gain);
    }
    osc.start(at);
    osc.stop(at + seconds + 0.05);
    osc.onended = () => gain.disconnect();
  }
}
