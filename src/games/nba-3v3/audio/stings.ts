import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * One off musical moments on top of the loop: the winners' fanfare and
 * the arena organ. Both go through the music's warm filter.
 */

/** A brass chord: two detuned saws and a square an octave down per note. */
function brass(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  for (const note of notes) {
    for (const detune of [-8, 8]) tone(engine, out, at, { type: "sawtooth", frequency: midi(note), detune, attack: 0.025, decay: length, peak });
    tone(engine, out, at, { type: "square", frequency: midi(note - 12), attack: 0.03, decay: length * 0.8, peak: peak * 0.4 });
  }
}

/** Bah bah bah BAAH: a rising Bb major call into a big held chord with a cymbal swell. */
export function winnersFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  const beat = 0.15;
  const line: [number, number, number][] = [[0, 58, 1], [1, 62, 1], [2, 65, 1], [3, 70, 2], [5, 65, 1], [6, 70, 4]];
  for (const [b, note, len] of line) brass(engine, out, at + b * beat, [note, note - 5], len * beat + 0.08, 0.024);
  const held = at + 6 * beat;
  brass(engine, out, held, [58, 62, 65, 70, 74], 2.4, 0.016);
  tone(engine, out, held, { frequency: midi(34), attack: 0.02, decay: 2.2, peak: 0.35 });
  noise(engine, out, held - 0.4, { filter: "highpass", frequency: 5000, attack: 0.4, decay: 1.8, peak: 0.12 });
  for (const b of [0, 3, 6]) {
    tone(engine, out, at + b * beat, { frequency: 120, glideTo: 45, decay: 0.3, peak: 0.4 });
    noise(engine, out, at + b * beat, { filter: "bandpass", frequency: 1800, q: 0.7, decay: 0.2, peak: 0.12 });
  }
}

/** The arena organ's "charge": a rising bugle call on a drawbar organ. */
export function organCharge(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [55, 60, 64, 67, 64, 67].forEach((note, i) => {
    const length = i === 5 ? 0.7 : 0.16;
    // Drawbars: the fundamental, the octave and a quiet twelfth.
    for (const [interval, peak] of [[0, 0.09], [12, 0.065], [19, 0.03]] as const) {
      tone(engine, out, at + i * 0.17, { type: "square", frequency: midi(note + interval), attack: 0.008, decay: length, peak });
    }
  });
}
