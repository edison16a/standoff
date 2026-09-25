import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, midi, noise, tone } from "@/platform/audio/voices";

/**
 * The little band the dojo music is played on: a plucked koto, a breathy
 * bamboo flute, soft taiko, a wood block, a shaker, a round bass and a
 * warm pad. Each is a few oscillators and a touch of noise.
 */

/** A plucked string: a quick bright pick, a triangle body and a ringing octave. */
export function koto(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  noise(engine, out, at, { filter: "bandpass", frequency: 2600, q: 2, decay: 0.012, peak: peak * 0.5 });
  // A string pulled a hair sharp settles onto its note, which is what makes it sound plucked.
  tone(engine, out, at, { type: "triangle", frequency: f * 1.012, glideTo: f, decay: 0.18, peak });
  tone(engine, out, at, { frequency: f, decay: 0.7, peak: peak * 0.7 });
  tone(engine, out, at, { frequency: f * 2, decay: 0.3, peak: peak * 0.25 });
}

/** A bamboo flute: a sine with a slow vibrato, and breath noise tuned to the note. */
export function flute(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(f * 0.97, at);
  osc.frequency.linearRampToValueAtTime(f, at + 0.08);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  // The vibrato blooms late in the note, like a player leaning into it.
  depth.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.5, lengthS * 0.6));
  lfo.connect(depth).connect(osc.frequency);
  const gain = ctx.createGain();
  envelope(gain.gain, at, 0.09, lengthS, peak);
  osc.connect(gain).connect(out);
  osc.start(at);
  lfo.start(at);
  const end = at + lengthS + 0.2;
  osc.stop(end);
  lfo.stop(end);
  osc.onended = () => gain.disconnect();
  noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 5, attack: 0.06, decay: lengthS * 0.7, peak: peak * 0.35 });
}

/** A soft taiko: a round low thump and the slap of the skin. */
export function taiko(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 105, glideTo: 58, decay: 0.38, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 420, decay: 0.09, peak: peak * 0.4 });
}

/** A hollow wood block, standing in for the snare. */
export function block(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1250, q: 7, decay: 0.05, peak: peak * 1.6 });
  tone(engine, out, at, { frequency: 880, glideTo: 820, decay: 0.05, peak: peak * 0.6 });
  noise(engine, out, at, { filter: "bandpass", frequency: 2200, q: 0.8, decay: 0.1, peak: peak * 0.3 });
}

export function shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 6500, attack: 0.012, decay: 0.05, peak });
}

export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), attack: 0.01, decay: lengthS, peak });
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.01, decay: lengthS * 0.5, peak: peak * 0.35 });
}

/** A warm swell under a whole bar. */
export function pad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  for (const note of notes) {
    tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: lengthS * 0.3, decay: lengthS * 0.8, peak });
    tone(engine, out, at, { frequency: midi(note), detune: 8, attack: lengthS * 0.3, decay: lengthS * 0.8, peak: peak * 0.8 });
  }
}

/** A single drop of water into the garden pond. */
export function drop(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  const f = 900 + Math.random() * 700;
  tone(engine, out, at, { frequency: f, glideTo: f * 2.2, decay: 0.09, peak });
}
