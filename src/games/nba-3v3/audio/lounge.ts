import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The late night band for the lobby: a soft "aah" choir pad, a Wurlitzer
 * with a lazy tremolo, a mellow sax lead and a padded kit. Every voice
 * eases in and out, so the lobby drifts like the empty court after dark.
 */

/** A held level: swell in, hold, then let go over `release`. Starts silent so it never clicks. */
function swell(param: AudioParam, at: number, attack: number, hold: number, release: number, peak: number): void {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.setValueAtTime(peak, at + Math.max(attack, hold));
  param.linearRampToValueAtTime(0, at + Math.max(attack, hold) + release);
}

/** Starts each oscillator into `into`, stops them at `end`, and runs `done` once the last one has ended. */
function run(ctx: BaseAudioContext, into: AudioNode, at: number, end: number, parts: readonly [OscillatorType, number, number][], done: () => void): OscillatorNode[] {
  return parts.map(([type, frequency, level], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const trim = ctx.createGain();
    trim.gain.value = level;
    osc.connect(trim).connect(into);
    osc.start(at);
    osc.stop(end);
    if (i === parts.length - 1) osc.onended = done;
    return osc;
  });
}

/**
 * The choir pad: each note a sine with a soft triangle an octave up,
 * through a vowel shaped band. It swells over half a second and its
 * release runs under the next chord, so the bed never breaks.
 */
export function choir(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const vowel = ctx.createBiquadFilter();
  vowel.type = "lowpass";
  vowel.frequency.value = 1300;
  vowel.Q.value = 1.4;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.55, length, 1, peak);
  vowel.connect(gain).connect(out);
  const parts = notes.flatMap((note, i): [OscillatorType, number, number][] => [
    ["sine", midi(note) * (1 + (i % 2 ? 0.002 : -0.002)), 1],
    ["triangle", midi(note + 12), 0.2],
  ]);
  run(ctx, vowel, at, at + length + 1.1, parts, () => gain.disconnect());
}

/** A Wurlitzer chord: triangles with a sine body and a tremolo that wobbles the level. */
export function wurli(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(peak * 0.3, at + length * 0.6);
  gain.gain.linearRampToValueAtTime(0, at + length);
  const tremolo = ctx.createGain();
  tremolo.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ctx.createGain();
  depth.gain.value = 0.25;
  lfo.connect(depth).connect(tremolo.gain);
  tremolo.connect(gain).connect(out);
  const parts = notes.flatMap((note): [OscillatorType, number, number][] => [["triangle", midi(note), 0.6], ["sine", midi(note), 1]]);
  run(ctx, tremolo, at, at + length + 0.05, parts, () => gain.disconnect());
  lfo.start(at);
  lfo.stop(at + length + 0.05);
}

/** A mellow sax: a saw through a soft reed band, breathed in with a scoop and a slow vibrato. */
export function sax(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const reed = ctx.createBiquadFilter();
  reed.type = "lowpass";
  reed.Q.value = 2;
  reed.frequency.setValueAtTime(f * 1.5, at);
  reed.frequency.linearRampToValueAtTime(f * 3, at + 0.12);
  reed.frequency.linearRampToValueAtTime(f * 2, at + length);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.07, length * 0.8, length * 0.35 + 0.15, peak * vary(1, 0.06));
  reed.connect(gain).connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.6;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(length > 0.5 ? 14 : 4, at + Math.min(0.5, length));
  lfo.connect(depth);
  const end = at + length * 1.15 + 0.3;
  const oscs = run(ctx, reed, at, end, [["sawtooth", f, 0.5], ["triangle", f, 1]], () => gain.disconnect());
  for (const osc of oscs) {
    osc.frequency.setValueAtTime(f * 0.97, at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.08);
    depth.connect(osc.detune);
  }
  // A little breath at the start of the note.
  noise(engine, out, at, { filter: "bandpass", frequency: f * 3, q: 3, attack: 0.03, decay: 0.12, peak: peak * 0.12 });
  lfo.start(at);
  lfo.stop(end);
}

/** A round bass that leans into each note. */
export function softBass(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f * 0.97, glideTo: f, attack: 0.02, decay: length, peak: vary(peak, 0.05) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.02, decay: length * 0.5, peak: peak * 0.14 });
}

/** The padded kit: a soft kick, a side stick on the backbeat and a brush of shaker. */
export const padded = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 95, glideTo: 44, attack: 0.006, decay: 0.3, peak: vary(peak, 0.08) });
  },
  stick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { type: "triangle", frequency: vary(560, 0.02), decay: 0.04, peak: vary(peak, 0.1) });
    noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 2, decay: 0.04, peak: peak * 0.5 });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 5800, q: 1, attack: 0.018, decay: 0.05, peak: vary(peak, 0.25) });
  },
};
