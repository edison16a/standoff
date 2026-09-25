import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "./voices";

/**
 * The band the tunes are played on: soft boom bap drums, a round sub
 * bass, an electric piano, a muted funk guitar, and two lead voices.
 * Every part is kept soft and low, and the music's own low pass takes
 * the last of the edge off, so it sits under the run instead of on it.
 */

/** A small random spread, so a loop never plays the same hit twice. */
function human(spread: number): number {
  return 1 + (Math.random() * 2 - 1) * spread;
}

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 118, glideTo: 44, decay: 0.26, peak: peak * human(0.08) });
  // A tiny click so the kick reads on laptop speakers that cannot play the low end.
  noise(engine, out, at, { filter: "lowpass", frequency: 1200, decay: 0.02, peak: peak * 0.12 });
}

/** A dusty snare: a short pitched body under a band of noise. */
export function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  const p = peak * human(0.1);
  tone(engine, out, at, { type: "triangle", frequency: 196, glideTo: 150, decay: 0.08, peak: p * 0.45 });
  noise(engine, out, at, { filter: "bandpass", frequency: 1700, q: 0.8, decay: 0.15, peak: p });
}

/** A rimshot knock, for the laid back sections. */
export function rim(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { type: "triangle", frequency: 820 * human(0.02), decay: 0.035, peak: peak * human(0.1) });
  noise(engine, out, at, { filter: "bandpass", frequency: 2600, q: 2, decay: 0.03, peak: peak * 0.5 });
}

export function hat(engine: AudioEngine, out: AudioNode, at: number, open: boolean, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7500, decay: open ? 0.14 : 0.035, peak: peak * human(0.2) });
}

/** A round sub note with a soft triangle on top, gliding up into it when `slide` is set. */
export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number, slide = false): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: slide ? f * 0.94 : f, glideTo: slide ? f : undefined, attack: 0.008, decay: length, peak });
  tone(engine, out, at, { type: "triangle", frequency: f, attack: 0.008, decay: length * 0.5, peak: peak * 0.22 });
}

/** Electric piano: a sine with a quiet bell partial, the notes rolled so it sounds played. */
export function keys(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.014;
    tone(engine, out, t, { frequency: midi(note), attack: 0.012, decay: length, peak });
    tone(engine, out, t, { frequency: midi(note + 24), detune: 4, attack: 0.004, decay: length * 0.25, peak: peak * 0.18 });
  });
}

/** A muted guitar chop: short plucks and a pick click, the funk on the offbeats. */
export function chop(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], peak: number): void {
  for (const note of notes) {
    tone(engine, out, at, { type: "triangle", frequency: midi(note), detune: (Math.random() - 0.5) * 8, attack: 0.003, decay: 0.07, peak });
  }
  noise(engine, out, at, { filter: "bandpass", frequency: 2200, q: 3, decay: 0.025, peak: peak * 0.8 });
}

/** The whistled hook: a pure tone that scoops up into each note. */
export function whistle(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note - 0.5), glideTo: midi(note), attack: 0.02, decay: length, peak });
  tone(engine, out, at, { frequency: midi(note + 12), attack: 0.02, decay: length * 0.4, peak: peak * 0.08 });
}

/** Vibraphone for the answering phrases: a soft strike and a long shimmer. */
export function vibes(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), attack: 0.004, decay: length, peak });
  tone(engine, out, at, { frequency: midi(note), detune: 9, attack: 0.004, decay: length * 0.8, peak: peak * 0.4 });
  tone(engine, out, at, { frequency: midi(note + 24), attack: 0.002, decay: length * 0.2, peak: peak * 0.12 });
}
