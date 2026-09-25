import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, midi, noise, tone } from "@/platform/audio/voices";

/**
 * The instruments the score is played on: a music box for the hook, a
 * lonely detuned synth for the answer, a low analog pulse, a soft electric
 * piano for the safehouse, and a dry, dusty kit. Old toys and tape, not
 * an orchestra, so the dread stays calm and a little sad.
 */

/** A small tuned comb: a pure tone with its slightly sharp overtones fading first. */
export function musicBox(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, decay: 1.4, peak });
  tone(engine, out, at, { frequency: f * 3.01, decay: 0.35, peak: peak * 0.22 });
  tone(engine, out, at, { frequency: f * 5.4, decay: 0.12, peak: peak * 0.08 });
}

/** Two slightly detuned saws swelling in and out, low passed so they stay soft. */
export function lonelySynth(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, at);
  filter.frequency.linearRampToValueAtTime(1400, at + lengthS * 0.4);
  filter.frequency.linearRampToValueAtTime(600, at + lengthS);
  const gain = ctx.createGain();
  envelope(gain.gain, at, Math.min(0.25, lengthS * 0.3), lengthS, peak);
  filter.connect(gain).connect(out);
  for (const detune of [-7, 7]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = midi(note);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + lengthS + 0.3);
    if (detune > 0) osc.onended = () => gain.disconnect();
  }
}

/** One note of the arpeggio: a short, dark saw blip. */
export function pulse(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  tone(engine, out, at, { type: "sawtooth", frequency: midi(note), decay: 0.14, peak: peak * 0.5 });
  tone(engine, out, at, { type: "triangle", frequency: midi(note), decay: 0.2, peak });
}

export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), attack: 0.008, decay: lengthS, peak });
  tone(engine, out, at, { type: "triangle", frequency: midi(note + 12), attack: 0.008, decay: lengthS * 0.4, peak: peak * 0.2 });
}

/** A soft electric piano chord, rolled a little so it sounds played. */
export function keys(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.02;
    tone(engine, out, t, { frequency: midi(note), attack: 0.01, decay: lengthS, peak });
    tone(engine, out, t, { type: "triangle", frequency: midi(note), detune: 5, attack: 0.01, decay: lengthS * 0.4, peak: peak * 0.4 });
  });
}

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 95, glideTo: 40, decay: 0.3, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 300, decay: 0.03, peak: peak * 0.2 });
}

/** A dusty rim knock with a short room tail. */
export function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1700, q: 1.2, decay: 0.07, peak });
  tone(engine, out, at, { type: "triangle", frequency: 330, glideTo: 260, decay: 0.05, peak: peak * 0.4 });
  noise(engine, out, at + 0.02, { filter: "bandpass", frequency: 900, q: 0.6, attack: 0.02, decay: 0.35, peak: peak * 0.25 });
}

export function hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7000, decay: 0.035, peak });
}

/** The surface noise of an old record: the odd tick. */
export function crackle(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at + Math.random() * 0.1, { filter: "bandpass", frequency: 2500 + Math.random() * 2500, q: 3, attack: 0.001, decay: 0.006, peak });
}
