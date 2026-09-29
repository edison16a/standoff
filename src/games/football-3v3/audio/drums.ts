import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The broadcast theme's drums: a tight marching snare that rolls into
 * every turn, a big bass drum, timpani tuned to the chord, and a crash
 * cymbal on the downbeats of a section. Everything is synthesised.
 */
export const drums = {
  /** A high tension snare: a crack of noise over a short, ringing body. */
  snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: vary(2400, 0.08), decay: 0.11, peak: vary(peak, 0.1) });
    noise(engine, out, at, { filter: "bandpass", frequency: 5200, q: 1.1, decay: 0.05, peak: peak * 0.5 });
    tone(engine, out, at, { type: "triangle", frequency: vary(330, 0.03), glideTo: 250, decay: 0.07, peak: peak * 0.8 });
  },

  /** A buzz roll: strokes a thirty second apart, swelling toward the downbeat. */
  roll(engine: AudioEngine, out: AudioNode, at: number, length: number, from: number, to: number): void {
    const strokes = Math.max(2, Math.round(length / 0.045));
    for (let i = 0; i < strokes; i++) {
      const f = i / (strokes - 1);
      drums.snare(engine, out, at + (i * length) / strokes, from + (to - from) * f);
    }
  },

  /** The bass drum: a deep boom with the beater's slap on top. */
  bass(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 64, glideTo: 42, attack: 0.003, decay: 0.42, peak: vary(peak, 0.05) });
    noise(engine, out, at, { filter: "lowpass", frequency: 700, decay: 0.03, peak: peak * 0.25 });
  },

  /** A timpani stroke on a note: the pitch settles a touch as the head relaxes. */
  timpani(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
    const f = midi(note);
    tone(engine, out, at, { frequency: f * 1.02, glideTo: f, attack: 0.004, decay: 1.1, peak: vary(peak, 0.05) });
    tone(engine, out, at, { frequency: f * 1.5, attack: 0.004, decay: 0.4, peak: peak * 0.25 });
    noise(engine, out, at, { filter: "lowpass", frequency: 400, decay: 0.12, peak: peak * 0.35 });
  },

  /** A crash cymbal: a wash of bright noise that rings on. */
  crash(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: 4800, attack: 0.002, decay: 1.6, peak: vary(peak, 0.06) });
    noise(engine, out, at, { filter: "bandpass", frequency: 8200, q: 0.8, decay: 0.8, peak: peak * 0.5 });
  },

  /** A tight hi hat tick, to keep the eighths moving. */
  hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: 8000, decay: 0.03, peak: vary(peak, 0.15) });
  },

  /** A floor tom, for the fills. */
  tom(engine: AudioEngine, out: AudioNode, at: number, high: boolean, peak: number): void {
    const f = high ? 150 : 105;
    tone(engine, out, at, { frequency: f * 1.2, glideTo: f, decay: 0.28, peak: vary(peak, 0.06) });
    noise(engine, out, at, { filter: "lowpass", frequency: 1200, decay: 0.05, peak: peak * 0.3 });
  },
};
