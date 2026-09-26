import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { LeadVoice, Tune } from "./tunes";

/**
 * The band behind the music: a tight kit, a round bass, a ticking pulse
 * for tension and a lead in one of three voices. Sines and triangles
 * carry most of it, so it drives without ever sounding harsh.
 */

function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 120, glideTo: 42, decay: 0.28, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 1400, decay: 0.012, peak: peak * 0.3 });
}

function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 0.8, decay: 0.15, peak });
  noise(engine, out, at + 0.008, { filter: "highpass", frequency: 4200, decay: 0.06, peak: peak * 0.5 });
  tone(engine, out, at, { type: "triangle", frequency: 210, glideTo: 170, decay: 0.07, peak: peak * 0.5 });
}

function hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 8000, decay: 0.025, peak });
}

function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.005, decay: length, peak });
  tone(engine, out, at, { type: "sawtooth", frequency: midi(note), attack: 0.005, decay: length * 0.35, peak: peak * 0.12 });
}

function lead(engine: AudioEngine, out: AudioNode, at: number, note: number, voice: LeadVoice, peak: number): void {
  const f = midi(note);
  switch (voice) {
    case "stab":
      // A short brassy stab: a square with a detuned twin, cut quickly.
      tone(engine, out, at, { type: "square", frequency: f, attack: 0.004, decay: 0.16, peak: peak * 0.35 });
      tone(engine, out, at, { type: "square", frequency: f, detune: 9, attack: 0.004, decay: 0.14, peak: peak * 0.25 });
      tone(engine, out, at, { type: "triangle", frequency: f, decay: 0.3, peak });
      return;
    case "pluck":
      tone(engine, out, at, { type: "triangle", frequency: f, decay: 0.34, peak });
      tone(engine, out, at, { frequency: f * 2, decay: 0.08, peak: peak * 0.3 });
      return;
    case "brass":
      tone(engine, out, at, { type: "sawtooth", frequency: f, attack: 0.02, decay: 0.28, peak: peak * 0.22 });
      tone(engine, out, at, { type: "sawtooth", frequency: f, detune: -8, attack: 0.02, decay: 0.26, peak: peak * 0.18 });
      tone(engine, out, at, { type: "triangle", frequency: f, attack: 0.01, decay: 0.36, peak: peak * 0.8 });
      return;
  }
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const sixteenth = 60 / tune.bpm / 4;
  const inBar = step % 16;
  const bar = Math.floor(step / 16);
  const [root, ...chord] = tune.chords[bar % tune.chords.length]!;
  const k = tune.key;
  const t = at + (inBar % 2 === 1 ? sixteenth * tune.swing : 0);
  const turn = bar % 4 === 3;

  if (tune.kick.includes(inBar)) kick(engine, out, t, inBar === 0 ? 0.32 : 0.25);
  if (tune.snare.includes(inBar)) snare(engine, out, t, 0.075);
  // A snare roll into every fourth bar's turn.
  if (turn && inBar >= 12) snare(engine, out, t, 0.02 + (inBar - 12) * 0.012);
  if (inBar % 2 === 0) hat(engine, out, t, inBar % 4 === 2 ? 0.028 : 0.014);

  const b = tune.bass[inBar];
  if (b !== null && b !== undefined) bass(engine, out, t, root! + k + b, sixteenth * (tune.pulse ? 0.9 : 1.8), 0.12);
  if (tune.pulse && chord.length) {
    // The tick of a clock: the chord's top notes in turn, soft and short.
    const note = chord[(inBar * 2) % chord.length]! + k + 12;
    tone(engine, out, t, { type: "sine", frequency: midi(note), decay: sixteenth * 0.7, peak: inBar % 4 === 0 ? 0.02 : 0.011 });
  }
  if (inBar === 0 || inBar === 8) for (const note of chord) tone(engine, out, t, { type: "triangle", frequency: midi(note + k), attack: 0.02, decay: sixteenth * 7, peak: 0.014 });

  const note = tune.hook[step % tune.hook.length];
  if (note !== null && note !== undefined) lead(engine, out, t, note + k, tune.lead, 0.05);
}
