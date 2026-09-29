import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The tailgate band for the lobby: an electric piano with a slow
 * tremolo, a vibraphone for the tune, a round bass and a soft kit
 * played with brushes. Every voice is gentle at the front, so the lobby
 * sits back while everyone picks their stars.
 */

/** An electric piano chord: a sine body, a bell partial that dies fast, and a lazy tremolo. */
export function keys(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const trem = ctx.createGain();
  trem.gain.value = 0.8;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.2;
  const depth = ctx.createGain();
  depth.gain.value = 0.2;
  lfo.connect(depth).connect(trem.gain);
  trem.connect(out);
  const end = at + length;
  for (const note of notes) {
    const p = vary(peak, 0.08);
    tone(engine, trem, at, { frequency: midi(note), attack: 0.006, decay: length, peak: p });
    tone(engine, trem, at, { frequency: midi(note) * 3.01, attack: 0.002, decay: 0.25, peak: p * 0.18 });
  }
  lfo.start(at);
  lfo.stop(end + 0.1);
  lfo.onended = () => trem.disconnect();
}

/** A vibraphone note: a pure bar tone with a soft fourth partial and the motor's shimmer. */
export function vibes(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const shimmer = ctx.createGain();
  shimmer.gain.value = 0.85;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.6;
  const depth = ctx.createGain();
  depth.gain.value = 0.15;
  lfo.connect(depth).connect(shimmer.gain);
  shimmer.connect(out);
  const ring = Math.max(0.6, length * 1.4);
  tone(engine, shimmer, at, { frequency: midi(note), attack: 0.004, decay: ring, peak: vary(peak, 0.06) });
  tone(engine, shimmer, at, { frequency: midi(note) * 4, attack: 0.002, decay: 0.3, peak: peak * 0.12 });
  lfo.start(at);
  lfo.stop(at + ring + 0.1);
  lfo.onended = () => shimmer.disconnect();
}

/** A round finger picked bass. */
export function bass(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, attack: 0.01, decay: length, peak: vary(peak, 0.05) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.008, decay: length * 0.3, peak: peak * 0.15 });
}

/** The soft kit: a padded kick, a brushed snare sweep and a quiet closed hat. */
export const kit = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 90, glideTo: 48, attack: 0.004, decay: 0.28, peak: vary(peak, 0.05) });
  },
  brush(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: vary(3000, 0.1), q: 0.7, attack: 0.02, decay: 0.2, peak: vary(peak, 0.1) });
  },
  hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: 7500, decay: 0.035, peak: vary(peak, 0.2) });
  },
};
