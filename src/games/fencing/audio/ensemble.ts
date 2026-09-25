import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { midi, noise, tone } from "../../../platform/audio/voices";

/**
 * The chamber band behind the fencing music: harpsichord, a string pad,
 * pizzicato strings, castanets and a soft brushed kit. Old world
 * instruments over a laid back beat, the salle with the lights low.
 */

/** A plucked harpsichord string: a bright quill snap over a thin, fading body. */
export function harpsichord(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { type: "sawtooth", frequency: f, attack: 0.002, decay: 0.55, peak: peak * 0.5 });
  tone(engine, out, at, { type: "square", frequency: f * 2, detune: 5, attack: 0.002, decay: 0.2, peak: peak * 0.25 });
  tone(engine, out, at, { frequency: f, attack: 0.002, decay: 0.9, peak });
}

/** Bowed strings: detuned saws with a slow swell, rounded off by the music's filter. */
export function strings(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  for (const note of notes) {
    for (const detune of [-9, 9]) tone(engine, out, at, { type: "sawtooth", frequency: midi(note), detune, attack: length * 0.35, decay: length * 0.75, peak });
  }
}

/** A plucked cello or violin: a round, short note. */
export function pizzicato(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.004, decay: 0.28, peak });
  tone(engine, out, at, { frequency: midi(note + 12), decay: 0.06, peak: peak * 0.3 });
}

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 96, glideTo: 42, decay: 0.3, peak });
}

/** A brush across the snare: a soft swish rather than a crack. */
export function brush(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 2600, sweepTo: 1500, q: 0.6, attack: 0.03, decay: 0.22, peak });
}

export function tick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7500, decay: 0.03, peak });
}

/** Castanets: two quick hard clicks of wood. */
export function castanets(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  for (const offset of [0, 0.018]) noise(engine, out, at + offset, { filter: "bandpass", frequency: 3200, q: 3, decay: 0.02, peak });
}
