import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { hz } from "./notes";

/**
 * The menu's softer band: electric piano chords, a breathy flute, a pad
 * that washes from one bar into the next, and a rim and shaker in place
 * of the snare and hats. Nothing here has a sharp edge, so the menu can
 * loop for as long as people take to pick a level.
 */

/** Fades a gain in, holds it and lets it go. */
function swell(engine: AudioEngine, out: AudioNode, at: number, attack: number, hold: number, release: number, peak: number): GainNode {
  const gain = engine.ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  gain.connect(out);
  return gain;
}

function osc(engine: AudioEngine, into: AudioNode, type: OscillatorType, frequency: number, detune: number, at: number, end: number): OscillatorNode {
  const node = engine.ctx.createOscillator();
  node.type = type;
  node.frequency.value = frequency;
  node.detune.value = detune;
  node.connect(into);
  node.start(at);
  node.stop(end);
  return node;
}

/** An electric piano: a round tine that rings a long time, with a faint bell on the strike. */
export function keys(engine: AudioEngine, out: AudioNode, at: number, midis: readonly number[], peak = 0.03): void {
  for (const midi of midis) {
    const f = hz(midi);
    tone(engine, out, at, { type: "sine", frequency: f, attack: 0.005, decay: 1.8, peak });
    tone(engine, out, at, { type: "triangle", frequency: f, detune: 5, attack: 0.005, decay: 0.9, peak: peak * 0.3 });
    tone(engine, out, at, { type: "sine", frequency: f * 3, attack: 0.002, decay: 0.12, peak: peak * 0.12 });
  }
}

/** A flute: a pure tone that swells in with a slow vibrato and a puff of breath on the attack. */
export function flute(engine: AudioEngine, out: AudioNode, at: number, midi: number, length: number, peak = 0.06): void {
  const { ctx } = engine;
  const f = hz(midi);
  const hold = Math.max(0, length - 0.1);
  const gain = swell(engine, out, at, 0.08, hold, 0.25, peak);
  const end = at + 0.08 + hold + 0.3;
  const oscs = [osc(engine, gain, "sine", f, 0, at, end), osc(engine, gain, "triangle", f, 4, at, end)];
  oscs[0]!.onended = () => gain.disconnect();
  if (length > 0.35) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 4.8;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(10, at + 0.4);
    lfo.connect(depth);
    for (const node of oscs) depth.connect(node.detune);
    lfo.start(at);
    lfo.stop(end);
  }
  noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 3, attack: 0.03, decay: 0.18, peak: peak * 0.25 });
}

/**
 * A pad that swells slowly, holds the bar and fades over the next one,
 * so chords wash into each other with no gap.
 */
export function wash(engine: AudioEngine, out: AudioNode, at: number, midis: readonly number[], length: number, peak = 0.02): void {
  const { ctx } = engine;
  const release = 1.6;
  const gain = swell(engine, out, at, Math.min(0.9, length * 0.35), length * 0.65, release, peak);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, at);
  filter.frequency.linearRampToValueAtTime(1300, at + length * 0.6);
  filter.frequency.linearRampToValueAtTime(800, at + length + release);
  filter.connect(gain);
  const end = at + length + release + 0.1;
  const oscs = midis.flatMap((midi) => [osc(engine, filter, "sawtooth", hz(midi), -8, at, end), osc(engine, filter, "triangle", hz(midi), 8, at, end)]);
  oscs[0]!.onended = () => gain.disconnect();
}

/** A side stick on the rim, the menu's backbeat. */
export function rim(engine: AudioEngine, out: AudioNode, at: number, peak = 0.08): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 4, decay: 0.035, peak });
  tone(engine, out, at, { type: "triangle", frequency: 520, decay: 0.03, peak: peak * 0.4 });
}

export function shaker(engine: AudioEngine, out: AudioNode, at: number, peak = 0.03): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 5000, q: 0.9, attack: 0.014, decay: 0.05, peak });
}
