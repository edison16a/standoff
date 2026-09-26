import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, tone } from "@/platform/audio/voices";
import { held } from "./arena-voices";

/** The organ's stab shapes: one hit, a rise into a hit, or the full "charge" call. */
export type Stab = "hit" | "rise" | "charge";

/** Drawbars: the fundamental, the octave and a quiet twelfth. */
const DRAWBARS = [[0, 1], [12, 0.6], [19, 0.25]] as const;

/**
 * The arena's own gear, on the effects bus: the game horn, the shot
 * clock's beeps and buzzer, and the organ. Horns and the organ run
 * through a low pass so square and saw waves stay full but never harsh.
 */
export class ArenaSounds {
  private readonly tame: BiquadFilterNode;

  constructor(
    private readonly engine: AudioEngine,
    private readonly out: AudioNode,
    private readonly wet: AudioNode,
  ) {
    this.tame = engine.ctx.createBiquadFilter();
    this.tame.type = "lowpass";
    this.tame.frequency.value = 2800;
    this.tame.Q.value = 0.4;
    this.tame.connect(out);
  }

  private get at(): number {
    return this.engine.now + 0.004;
  }

  /** The big game horn: a thick reed chord held flat, for the tip and the final basket. */
  gameHorn(long: boolean): void {
    const hold = long ? 1.9 : 1.1;
    for (const note of [46, 50, 53]) {
      for (const detune of [-7, 7]) held(this.engine, this.tame, this.at, { type: "sawtooth", frequency: midi(note), detune, hold, peak: 0.05, release: 0.18 });
      held(this.engine, this.wet, this.at, { type: "sawtooth", frequency: midi(note), hold, peak: 0.02, release: 0.3 });
    }
    held(this.engine, this.tame, this.at, { type: "square", frequency: midi(34), hold, peak: 0.06, release: 0.18 });
  }

  /** The shot clock ran out: one flat, nasal buzz, shorter and meaner than the game horn. */
  shotClockBuzzer(): void {
    held(this.engine, this.tame, this.at, { type: "square", frequency: 196, hold: 0.85, peak: 0.07, release: 0.06 });
    held(this.engine, this.tame, this.at, { type: "sawtooth", frequency: 392, detune: 12, hold: 0.85, peak: 0.04, release: 0.06 });
    held(this.engine, this.wet, this.at, { type: "square", frequency: 196, hold: 0.85, peak: 0.02, release: 0.2 });
  }

  /** The shot clock's beep for each of the last five seconds, higher for the final two. */
  clockBeep(left: number): void {
    const frequency = left <= 2 ? 1760 : 1320;
    held(this.engine, this.out, this.at, { type: "sine", frequency, hold: 0.07, peak: 0.14, attack: 0.004, release: 0.03 });
    held(this.engine, this.out, this.at, { type: "triangle", frequency: frequency * 2, hold: 0.05, peak: 0.02, attack: 0.004, release: 0.03 });
  }

  /** A short organ stab for a big moment. `key` picks the chord root so repeats do not all sound alike. */
  organ(stab: Stab, key = 60): void {
    const at = this.at;
    if (stab === "hit") return this.chord(at, [key, key + 4, key + 7], 0.2);
    if (stab === "rise") {
      this.chord(at, [key - 5, key - 1, key + 2], 0.1);
      return this.chord(at + 0.16, [key, key + 4, key + 7, key + 12], 0.34);
    }
    // Da da da DAH, da DAAH: the charge call, on the organ.
    const call: [number, number, number][] = [[0, 0, 0.1], [1, 5, 0.1], [2, 9, 0.1], [3, 12, 0.22], [5, 9, 0.1], [6, 12, 0.5]];
    for (const [beat, step, length] of call) this.chord(at + beat * 0.15, [key - 5 + step, key - 5 + step + 12], length);
  }

  private chord(at: number, notes: readonly number[], length: number): void {
    for (const note of notes) {
      for (const [interval, level] of DRAWBARS) {
        tone(this.engine, this.tame, at, { type: "square", frequency: midi(note + interval), attack: 0.006, decay: length, peak: 0.04 * level });
      }
      tone(this.engine, this.wet, at, { type: "sine", frequency: midi(note), decay: length + 0.2, peak: 0.03 });
    }
  }

  dispose(): void {
    this.tame.disconnect();
  }
}
