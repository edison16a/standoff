import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The instruments the score is played on: a cold glass bell for the
 * horror hook, heroic synth horns for the answer, dark sustained strings,
 * a pulsing low synth, a sub bass, a warm electric piano for the
 * safehouse, and a heavy kit with toms. Everything is filtered at the
 * source as well, so the dread stays dark and never harsh.
 */

interface Shape {
  attack: number;
  release: number;
  peak: number;
  /** Filter cutoff at the start and after the attack. */
  from: number;
  to: number;
}

/** Oscillators through one filter and one hold envelope, shared so a chord is no louder than a note. */
function voice(engine: AudioEngine, out: AudioNode, at: number, lengthS: number, oscs: readonly [OscillatorType, number, number][], shape: Shape): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(shape.from, at);
  filter.frequency.exponentialRampToValueAtTime(shape.to, at + Math.max(0.02, shape.attack));
  const gain = ctx.createGain();
  const peak = shape.peak / oscs.length;
  const hold = at + Math.max(shape.attack, lengthS);
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + shape.attack);
  gain.gain.setValueAtTime(peak, hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, hold + shape.release);
  filter.connect(gain).connect(out);
  oscs.forEach(([type, note, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midi(note);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(hold + shape.release + 0.05);
    if (i === 0) osc.onended = () => gain.disconnect();
  });
}

/** A glass bell: a pure tone with an inharmonic shimmer that fades first, cold and a little wrong. */
export function glassBell(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, attack: 0.004, decay: 1.6, peak });
  tone(engine, out, at, { frequency: f * 2.76, attack: 0.002, decay: 0.4, peak: peak * 0.18 });
  tone(engine, out, at, { frequency: f * 0.5, attack: 0.01, decay: 1.2, peak: peak * 0.3 });
}

/** Heroic synth horns: three saws that swell with the filter opening, like brass leaning in. */
export function horns(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS, [["sawtooth", note, -8], ["sawtooth", note, 8], ["sawtooth", note - 12, 0]], { attack: 0.09, release: 0.3, peak, from: 350, to: 1500 });
}

/** Dark strings that swell in and hold, then let go while the next chord swells. */
export function strings(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  const oscs = notes.flatMap((note): [OscillatorType, number, number][] => [["sawtooth", note, -6], ["sawtooth", note, 6]]);
  voice(engine, out, at, lengthS, oscs, { attack: lengthS * 0.3, release: lengthS * 0.5, peak, from: 500, to: 900 });
}

/** A warm, soft pad for the safehouse: triangles and sines, no edge at all. */
export function warmPad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  const oscs = notes.flatMap((note): [OscillatorType, number, number][] => [["triangle", note, -5], ["sine", note, 6]]);
  voice(engine, out, at, lengthS, oscs, { attack: lengthS * 0.35, release: lengthS * 0.5, peak, from: 900, to: 1200 });
}

/** One throb of the pulsing low synth. */
export function pulse(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS, [["sawtooth", note, 0], ["square", note, 4]], { attack: 0.005, release: 0.05, peak, from: 900, to: 300 });
}

export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), attack: 0.01, decay: lengthS, peak });
}

/** A soft electric piano chord, rolled a little so it sounds played. */
export function keys(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.025;
    tone(engine, out, t, { frequency: midi(note), attack: 0.01, decay: lengthS, peak });
    tone(engine, out, t, { frequency: midi(note) * 4, attack: 0.002, decay: 0.1, peak: peak * 0.1 });
  });
}

export const kit = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 110, glideTo: 40, decay: 0.3, peak });
    noise(engine, out, at, { filter: "lowpass", frequency: 400, decay: 0.03, peak: peak * 0.2 });
  },
  /** A big dry snare with a short room tail. */
  snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 1500, q: 0.9, decay: 0.12, peak });
    tone(engine, out, at, { type: "triangle", frequency: 210, glideTo: 170, decay: 0.08, peak: peak * 0.5 });
    noise(engine, out, at + 0.02, { filter: "bandpass", frequency: 800, q: 0.6, attack: 0.02, decay: 0.3, peak: peak * 0.25 });
  },
  /** A low war tom, `pitch` from 0 (floor) up. */
  tom(engine: AudioEngine, out: AudioNode, at: number, pitch: number, peak: number): void {
    const f = 80 + pitch * 25;
    tone(engine, out, at, { frequency: f * 1.4, glideTo: f, decay: 0.32, peak });
    noise(engine, out, at, { filter: "lowpass", frequency: 700, decay: 0.05, peak: peak * 0.3 });
  },
  hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: 7000, decay: 0.035, peak });
  },
  /** The surface noise of an old record: the odd tick. */
  crackle(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at + Math.random() * 0.1, { filter: "bandpass", frequency: 2500 + Math.random() * 2500, q: 3, attack: 0.001, decay: 0.006, peak });
  },
};
