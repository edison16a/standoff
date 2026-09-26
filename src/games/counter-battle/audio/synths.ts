import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi } from "@/platform/audio/voices";

/**
 * The pitched voices: a dark synth lead and a brass lead for the match,
 * vibes for the lobby, a slow pad under both and the sixteenth pulse
 * that drives the match. The platform's `tone` only rings down from its
 * peak, so the voices that hold shape their own envelopes.
 */

export type LeadVoice = "dark" | "brass" | "vibes";

/** Fades a gain in, holds it and lets it go, then unhooks it once it is silent. */
function shaped(engine: AudioEngine, out: AudioNode, at: number, attack: number, hold: number, release: number, peak: number): GainNode {
  const gain = engine.ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  gain.connect(out);
  return gain;
}

/** Starts oscillators into a node and lets the node go when the first one ends. */
function voices(engine: AudioEngine, into: AudioNode, release: AudioNode, at: number, end: number, specs: [OscillatorType, number, number][]): OscillatorNode[] {
  const oscs = specs.map(([type, frequency, detune]) => {
    const osc = engine.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.connect(into);
    osc.start(at);
    osc.stop(end);
    return osc;
  });
  oscs[0]!.onended = () => release.disconnect();
  return oscs;
}

function lowpass(engine: AudioEngine, at: number, from: number, to: number, settle: number): BiquadFilterNode {
  const filter = engine.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + settle);
  return filter;
}

/** The tune on top. Long notes get a slow vibrato, which is what makes a synth line sing. */
export function lead(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, voice: LeadVoice, peak: number): void {
  const f = midi(note);
  if (voice === "vibes") return vibes(engine, out, at, f, peak);
  const brass = voice === "brass";
  // Three oscillators sum to about twice one, so the level is halved to match the vibes.
  const gain = shaped(engine, out, at, brass ? 0.03 : 0.012, Math.max(0, length - 0.05), 0.16, peak * 0.5);
  const filter = lowpass(engine, at, brass ? 500 : 2200, brass ? 2000 : 1100, brass ? 0.09 : 0.25);
  filter.connect(gain);
  const end = at + length + 0.25;
  const oscs = voices(engine, filter, gain, at, end, brass ? [["sawtooth", f, -8], ["sawtooth", f, 8], ["triangle", f / 2, 0]] : [["sawtooth", f, -6], ["square", f, 6], ["sine", f / 2, 0]]);
  if (length < 0.3) return;
  const lfo = engine.ctx.createOscillator();
  const depth = engine.ctx.createGain();
  lfo.frequency.value = 5;
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(12, at + 0.35);
  lfo.connect(depth);
  for (const osc of oscs) depth.connect(osc.detune);
  lfo.start(at);
  lfo.stop(end);
}

/** A vibraphone bar: a pure tone with its bright fourth partial, and the motor's slow tremolo. */
function vibes(engine: AudioEngine, out: AudioNode, at: number, f: number, peak: number): void {
  const { ctx } = engine;
  const gain = shaped(engine, out, at, 0.004, 0, 2.2, peak);
  const tremolo = ctx.createGain();
  tremolo.gain.value = 0.8;
  const motor = ctx.createOscillator();
  const depth = ctx.createGain();
  motor.frequency.value = 4.5;
  depth.gain.value = 0.2;
  motor.connect(depth).connect(tremolo.gain);
  motor.start(at);
  motor.stop(at + 2.4);
  tremolo.connect(gain);
  voices(engine, tremolo, gain, at, at + 2.4, [["sine", f, 0]]);
  const shine = shaped(engine, gain, at, 0.002, 0, 0.35, 0.25);
  voices(engine, shine, shine, at, at + 0.4, [["sine", f * 4, 0]]);
}

/**
 * A dark pad: detuned saws through a low pass that breathes slowly, held
 * for the bar and fading over the next, so chords flow into each other.
 */
export function pad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number, cutoff: number): void {
  const { ctx } = engine;
  const gain = shaped(engine, out, at, Math.min(0.8, length * 0.3), length * 0.7, 1.4, peak);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(cutoff * 0.6, at);
  filter.frequency.linearRampToValueAtTime(cutoff, at + length * 0.6);
  filter.frequency.linearRampToValueAtTime(cutoff * 0.7, at + length + 1.4);
  filter.connect(gain);
  voices(engine, filter, gain, at, at + length + 1.5, notes.flatMap((note) => [["sawtooth", midi(note), -10], ["sawtooth", midi(note), 10]] as [OscillatorType, number, number][]));
}

/** One tick of the driving pulse: a short, filtered saw that snaps shut. */
export function pulse(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const gain = shaped(engine, out, at, 0.004, length * 0.4, length * 0.6, peak);
  const filter = lowpass(engine, at, 1300, 260, length);
  filter.connect(gain);
  voices(engine, filter, gain, at, at + length + 0.05, [["sawtooth", midi(note), 0], ["sine", midi(note) / 2, 0]]);
}
