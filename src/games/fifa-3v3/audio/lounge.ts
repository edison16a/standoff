import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The warm up band for the lobby: a sunset pad, a nylon guitar brushed
 * softly, a round bass, an alto flute and a hummed "oo" for the answer,
 * with a shaker and a soft clave. Everything eases in, like the last
 * light over the pitch.
 */

/** A held level: swell in, hold, then let go over `release`. Starts silent so it never clicks. */
function swell(param: AudioParam, at: number, attack: number, hold: number, release: number, peak: number): void {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.setValueAtTime(peak, at + Math.max(attack, hold));
  param.linearRampToValueAtTime(0, at + Math.max(attack, hold) + release);
}

/** Oscillators into one gain; the last one to stop unhooks it. Returns them for pitch tweaks. */
function voices(ctx: BaseAudioContext, into: AudioNode, gain: GainNode, at: number, end: number, parts: readonly (readonly [OscillatorType, number, number])[]): OscillatorNode[] {
  return parts.map(([type, frequency, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.connect(into);
    osc.start(at);
    osc.stop(end);
    if (i === parts.length - 1) osc.onended = () => gain.disconnect();
    return osc;
  });
}

/**
 * The sunset pad: sines and triangles spread a few cents apart, so it
 * shimmers like a chorus. Its release runs under the next chord, so the
 * bed never breaks between bars.
 */
export function sunset(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1600;
  filter.Q.value = 0.3;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.8, length, 1.2, peak);
  filter.connect(gain).connect(out);
  const parts = notes.flatMap((note) => [["sine", midi(note), -10], ["triangle", midi(note), 10]] as const);
  voices(ctx, filter, gain, at, at + length + 1.3, parts);
}

/** A soft nylon strum: triangle plucks a few milliseconds apart, thumbed rather than picked. */
export function nylon(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.018;
    tone(engine, out, t, { type: "triangle", frequency: midi(note), attack: 0.008, decay: 0.7, peak: vary(peak, 0.1) });
    tone(engine, out, t, { frequency: midi(note + 12), attack: 0.004, decay: 0.15, peak: peak * 0.2 });
  });
}

/** An alto flute: a sine with a little triangle, a breath on the start, and vibrato once it settles. */
export function flute(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.08, length * 0.8, length * 0.35 + 0.15, vary(peak, 0.06));
  gain.connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(length > 0.5 ? 11 : 3, at + Math.min(0.5, length));
  lfo.connect(depth);
  const end = at + length * 1.15 + 0.3;
  const trim = ctx.createGain();
  trim.gain.value = 1;
  trim.connect(gain);
  for (const osc of voices(ctx, trim, gain, at, end, [["triangle", f, 0], ["sine", f, 0]])) depth.connect(osc.detune);
  noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 4, attack: 0.03, decay: 0.14, peak: peak * 0.15 });
  lfo.start(at);
  lfo.stop(end);
}

/** A hummed "oo": two soft sines an octave apart, slow to arrive. */
export function hum(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.2, length * 0.8, length * 0.4 + 0.3, vary(peak, 0.06));
  gain.connect(out);
  voices(ctx, gain, gain, at, at + length * 1.2 + 0.4, [["sine", midi(note), 0], ["sine", midi(note - 12), 4], ["triangle", midi(note), -4]]);
}

export function upright(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, attack: 0.015, decay: length, peak: vary(peak, 0.05) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.01, decay: length * 0.3, peak: peak * 0.18 });
}

export const hands = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 92, glideTo: 48, attack: 0.006, decay: 0.28, peak: vary(peak, 0.08) });
  },
  clave(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: vary(1250, 0.01), attack: 0.002, decay: 0.05, peak: vary(peak, 0.1) });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 6200, q: 1.1, attack: 0.015, decay: 0.045, peak: vary(peak, 0.25) });
  },
};
