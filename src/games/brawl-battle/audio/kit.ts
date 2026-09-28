import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The drums and the bass. A punchy kit for the battle and a soft one
 * for the lobby, both rounded off with sines and filtered noise so they
 * drive without ever turning harsh.
 */

/** A small random spread around 1, so repeated hits never sound stamped out. */
function human(spread = 0.1): number {
  return 1 - spread / 2 + Math.random() * spread;
}

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 140, glideTo: 46, decay: 0.24, peak });
  // The beater's click, which lets a fast kick cut through a full band.
  tone(engine, out, at, { type: "triangle", frequency: 900, glideTo: 200, decay: 0.012, peak: peak * 0.2 });
}

export function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  const p = peak * human();
  noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 0.7, decay: 0.15, peak: p });
  noise(engine, out, at + 0.008, { filter: "bandpass", frequency: 1100, q: 1.4, decay: 0.06, peak: p * 0.8 });
  tone(engine, out, at, { type: "triangle", frequency: 205, glideTo: 165, decay: 0.08, peak: p * 0.6 });
}

/** A brush swept across the snare: all wires, no crack. */
export function brush(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 2600, q: 0.6, attack: 0.02, decay: 0.2, peak: peak * human() });
}

export function hat(engine: AudioEngine, out: AudioNode, at: number, peak: number, open = false): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7200, decay: open ? 0.14 : 0.03, peak: peak * human(0.3) });
}

export function shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 5200, q: 0.9, attack: 0.012, decay: 0.05, peak: peak * human(0.3) });
}

export function crash(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 4800, decay: 1.4, peak });
}

/** A floor tom for the fills. */
export function tom(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), glideTo: midi(note) * 0.7, decay: 0.22, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 900, decay: 0.05, peak: peak * 0.3 });
}

/** A round bass: a triangle for the note and a sine an octave down for the weight. */
export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.006, decay: length, peak });
  tone(engine, out, at, { frequency: midi(note - 12), attack: 0.008, decay: length * 0.9, peak: peak * 0.7 });
}
