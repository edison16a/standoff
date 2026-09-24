import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * Short pieces of music: a brassy victory fanfare with timpani for the
 * winners, a rising sting for a goal, and a relaxed groove under the
 * lobby while players pick their stars.
 */
export class Music {
  private groove: ReturnType<typeof setInterval> | null = null;
  private bar = 0;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("music");
  }

  /** A brass chord: detuned saws through a warm filter. */
  private brass(at: number, notes: readonly number[], length: number, peak: number): void {
    const { ctx } = this.engine;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, at);
    filter.frequency.linearRampToValueAtTime(2600, at + 0.08);
    filter.frequency.exponentialRampToValueAtTime(1200, at + length);
    filter.connect(this.out);
    for (const n of notes) {
      for (const detune of [-7, 7]) tone(this.engine, filter, at, { type: "sawtooth", frequency: midi(n), attack: 0.03, decay: length, peak, detune });
    }
    setTimeout(() => filter.disconnect(), (length + 1) * 1000);
  }

  private timpani(at: number, note: number, peak = 0.5): void {
    tone(this.engine, this.out, at, { type: "sine", frequency: midi(note), glideTo: midi(note) * 0.92, decay: 0.8, peak });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 300, decay: 0.25, peak: peak * 0.4 });
  }

  /** Da da da daaa: the winners' fanfare, in C major, landing on a big chord. */
  fanfare(): void {
    const at = this.engine.now + 0.05;
    const beat = 0.19;
    const line: [number, number, number][] = [
      [0, 67, 1], [1, 67, 1], [2, 67, 1], [3, 72, 3], [6, 71, 1], [7, 72, 1], [8, 76, 5],
    ];
    for (const [b, note, len] of line) this.brass(at + b * beat, [note, note - 12, note - 5], len * beat + 0.1, 0.035);
    this.brass(at + 8 * beat, [60, 64, 67, 72], 2.2, 0.03);
    for (const b of [0, 3, 6, 8]) this.timpani(at + b * beat, b === 8 ? 36 : 43);
    noise(this.engine, this.out, at + 8 * beat, { filter: "highpass", frequency: 6000, decay: 2, peak: 0.12 });
  }

  /** A quick rising sting under the goal roar. */
  goalSting(): void {
    const at = this.engine.now;
    [60, 64, 67, 72].forEach((n, i) => this.brass(at + i * 0.07, [n, n + 12], 0.35, 0.03));
    this.brass(at + 0.3, [60, 67, 72, 76], 1.2, 0.028);
    this.timpani(at + 0.3, 36, 0.4);
  }

  /** A gentle bass and chord loop for the lobby. */
  startGroove(): void {
    if (this.groove) return;
    const beat = 0.5;
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] as const;
    const play = () => {
      const at = this.engine.now + 0.05;
      const chord = chords[this.bar % chords.length]!;
      tone(this.engine, this.out, at, { type: "triangle", frequency: midi(chord[0] - 12), decay: beat * 1.8, peak: 0.1 });
      tone(this.engine, this.out, at + beat * 2, { type: "triangle", frequency: midi(chord[0] - 12), decay: beat * 1.8, peak: 0.08 });
      for (let i = 0; i < 4; i++) {
        for (const n of chord) tone(this.engine, this.out, at + i * beat + beat * 0.5, { type: "sine", frequency: midi(n), decay: 0.28, peak: 0.018 });
        noise(this.engine, this.out, at + i * beat, { filter: "highpass", frequency: 7000, decay: 0.04, peak: 0.03 });
      }
      this.bar++;
    };
    play();
    this.groove = setInterval(play, beat * 4 * 1000);
  }

  stopGroove(): void {
    if (this.groove) clearInterval(this.groove);
    this.groove = null;
  }
}
