import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { midi, noise, tone } from "../../../platform/audio/voices";
import { held } from "./voice";

/**
 * The band behind Blade Clash: taiko drums, a brass section, driving
 * strings, a choir, and for the lobby a harp, a wooden flute and a frame
 * drum. Everything is synthesised; each instrument is a few oscillators
 * and filtered noise shaped to sound like the real thing.
 */

type Out = AudioNode;

/** A big taiko: a deep pitched thump with the skin's slap on top. */
export function taiko(engine: AudioEngine, out: Out, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 78, glideTo: 46, decay: 0.55, peak });
  tone(engine, out, at, { frequency: 150, glideTo: 90, decay: 0.12, peak: peak * 0.4 });
  noise(engine, out, at, { filter: "lowpass", frequency: 420, decay: 0.16, peak: peak * 0.55 });
}

/** The taiko's rim, struck with the stick: the sharp "ka". */
export function rim(engine: AudioEngine, out: Out, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 2400, q: 3, decay: 0.05, peak });
  tone(engine, out, at, { type: "triangle", frequency: 820, decay: 0.04, peak: peak * 0.5 });
}

export function shaker(engine: AudioEngine, out: Out, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 6500, attack: 0.008, decay: 0.05, peak });
}

/** A cymbal: a crash, or with `swell` a roll rising into the next bar. */
export function cymbal(engine: AudioEngine, out: Out, at: number, peak: number, swell = 0): void {
  noise(engine, out, at, { filter: "highpass", frequency: 5200, attack: swell || 0.004, decay: swell ? 0.12 : 1.6, peak });
}

/** Brass: detuned saws through a lowpass that opens on the blow, a stab or a held chord. */
export function brass(engine: AudioEngine, out: Out, at: number, notes: readonly number[], length: number, peak: number): void {
  for (const note of notes) {
    for (const detune of [-7, 7]) {
      held(engine, out, at, { frequency: midi(note), detune, attack: 0.03, hold: Math.max(0, length - 0.12), release: 0.16, peak, filter: { from: 380, to: 2600, q: 1.2 } });
    }
  }
}

/** The lead horn: a brassy line that carries the tune over everything. */
export function horn(engine: AudioEngine, out: Out, at: number, note: number, length: number, peak: number): void {
  held(engine, out, at, { frequency: midi(note), attack: 0.025, hold: Math.max(0, length - 0.08), release: 0.12, peak, filter: { from: 600, to: 3200, q: 1.5 } });
  held(engine, out, at, { type: "square", frequency: midi(note), detune: 4, attack: 0.02, hold: Math.max(0, length - 0.08), release: 0.1, peak: peak * 0.35, filter: { from: 500, to: 1800 } });
}

/** Strings bowed short and hard, the driving eighths under a battle theme. */
export function stringStab(engine: AudioEngine, out: Out, at: number, note: number, peak: number): void {
  for (const detune of [-10, 10]) held(engine, out, at, { frequency: midi(note), detune, attack: 0.008, hold: 0.05, release: 0.1, peak, filter: { from: 900, to: 2400 } });
}

/** Long bowed strings, swelling in. */
export function strings(engine: AudioEngine, out: Out, at: number, notes: readonly number[], length: number, peak: number): void {
  for (const note of notes) {
    for (const detune of [-9, 9]) held(engine, out, at, { frequency: midi(note), detune, attack: length * 0.3, hold: length * 0.5, release: length * 0.4, peak, filter: { from: 700, to: 1800 } });
  }
}

/** A choir singing "ah": saws through two vowel formants. */
export function choir(engine: AudioEngine, out: Out, at: number, notes: readonly number[], length: number, peak: number): void {
  const { ctx } = engine;
  const vowel = ctx.createGain();
  for (const [frequency, q, level] of [[730, 6, 1], [1090, 7, 0.6], [2440, 8, 0.25]] as const) {
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.frequency.value = frequency;
    formant.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level * 4;
    vowel.connect(formant).connect(gain).connect(out);
    setTimeout(() => gain.disconnect(), (at - engine.now + length * 1.5 + 1) * 1000);
  }
  for (const note of notes) {
    for (const detune of [-12, 0, 12]) held(engine, vowel, at, { frequency: midi(note), detune, attack: length * 0.3, hold: length * 0.5, release: length * 0.5, peak });
  }
}

/** A deep plucked bass that locks with the drums. */
export function bass(engine: AudioEngine, out: Out, at: number, note: number, peak: number): void {
  held(engine, out, at, { frequency: midi(note), attack: 0.005, hold: 0.08, release: 0.22, peak, filter: { from: 240, to: 900, q: 2 } });
  tone(engine, out, at, { frequency: midi(note), decay: 0.3, peak: peak * 0.8 });
}

/** A harp string: bright at the pluck and ringing on. */
export function harp(engine: AudioEngine, out: Out, at: number, note: number, peak: number): void {
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.003, decay: 1.1, peak });
  tone(engine, out, at, { frequency: midi(note + 12), attack: 0.002, decay: 0.3, peak: peak * 0.35 });
}

/** A wooden flute: a pure tone with a breath of air round it. */
export function flute(engine: AudioEngine, out: Out, at: number, note: number, length: number, peak: number): void {
  held(engine, out, at, { type: "sine", frequency: midi(note), attack: 0.05, hold: Math.max(0, length - 0.1), release: 0.14, peak });
  held(engine, out, at, { type: "triangle", frequency: midi(note), detune: 3, attack: 0.06, hold: Math.max(0, length - 0.1), release: 0.12, peak: peak * 0.3 });
  noise(engine, out, at, { filter: "bandpass", frequency: midi(note) * 2, q: 4, attack: 0.04, decay: length * 0.8, peak: peak * 0.25 });
}

/** A frame drum played with the hand: a soft low boom and the fingers' tap. */
export function frameDrum(engine: AudioEngine, out: Out, at: number, peak: number, tap = false): void {
  if (tap) noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 1.5, decay: 0.04, peak });
  else {
    tone(engine, out, at, { frequency: 120, glideTo: 82, decay: 0.28, peak });
    noise(engine, out, at, { filter: "lowpass", frequency: 800, decay: 0.08, peak: peak * 0.4 });
  }
}
