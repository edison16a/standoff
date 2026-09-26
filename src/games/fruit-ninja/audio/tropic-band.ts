import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, midi, noise, tone } from "@/platform/audio/voices";

/**
 * The little island band Fruit Slicer's music is played on: a wooden
 * marimba, a ringing steel drum, a pan flute, a round bass, a warm pad,
 * and soft hand percussion (congas, claves, a shaker and a padded kick).
 * Each is a few oscillators and a touch of noise.
 */

/** A soft mallet on a wooden bar: a round note and a quick woody overtone. */
export function marimba(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, attack: 0.003, decay: 0.55, peak });
  // A real bar is tuned so its first overtone sits two octaves up, which is where the wood lives.
  tone(engine, out, at, { frequency: f * 4, attack: 0.002, decay: 0.07, peak: peak * 0.22 });
  noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 3, decay: 0.02, peak: peak * 0.25 });
}

/** A steel pan: a bright ringing note with the pan's slightly sharp octave and twelfth. */
export function steelDrum(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  const f = midi(note);
  const ring = Math.max(0.35, lengthS);
  tone(engine, out, at, { frequency: f, attack: 0.004, decay: ring, peak });
  tone(engine, out, at, { frequency: f * 2.01, attack: 0.003, decay: ring * 0.6, peak: peak * 0.4 });
  tone(engine, out, at, { type: "triangle", frequency: f * 3.02, attack: 0.002, decay: ring * 0.25, peak: peak * 0.15 });
}

/** A pan flute: a sine with a slow vibrato, and breath noise tuned to the note. */
export function panFlute(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(f * 0.98, at);
  osc.frequency.linearRampToValueAtTime(f, at + 0.1);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.8;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(f * 0.01, at + Math.min(0.6, lengthS * 0.6));
  lfo.connect(depth).connect(osc.frequency);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  envelope(gain.gain, at, 0.12, lengthS, peak);
  osc.connect(gain).connect(out);
  const end = at + lengthS + 0.25;
  for (const node of [osc, lfo]) {
    node.start(at);
    node.stop(end);
  }
  osc.onended = () => gain.disconnect();
  noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 6, attack: 0.08, decay: lengthS * 0.6, peak: peak * 0.3 });
}

export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), attack: 0.012, decay: lengthS, peak });
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.012, decay: lengthS * 0.4, peak: peak * 0.3 });
}

/**
 * A warm pad that swells in, holds for `lengthS`, then lets go over `releaseS`.
 * Starting the next pad while this one lets go is what keeps the sound flowing.
 */
export function pad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number, releaseS = lengthS * 0.5): void {
  const { ctx } = engine;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + lengthS * 0.35);
  gain.gain.setValueAtTime(peak, at + lengthS);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + lengthS + releaseS);
  gain.connect(out);
  const end = at + lengthS + releaseS + 0.05;
  notes.forEach((note, i) => {
    for (const [type, detune] of [["triangle", -5], ["sine", 6]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = midi(note);
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(at);
      osc.stop(end);
      if (i === 0 && type === "sine") osc.onended = () => gain.disconnect();
    }
  });
}

export const hands = {
  /** An open conga tone, `high` for the smaller drum. */
  conga(engine: AudioEngine, out: AudioNode, at: number, high: boolean, peak: number): void {
    const f = high ? 330 : 220;
    tone(engine, out, at, { frequency: f * 1.25, glideTo: f, decay: 0.2, peak });
    noise(engine, out, at, { filter: "bandpass", frequency: f * 3, q: 2, decay: 0.02, peak: peak * 0.3 });
  },
  clave(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 2400, decay: 0.05, peak });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: 6000, attack: 0.014, decay: 0.05, peak });
  },
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 100, glideTo: 52, decay: 0.26, peak });
  },
};
