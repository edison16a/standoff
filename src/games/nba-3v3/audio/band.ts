import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { Tune } from "./tunes";

/**
 * The house band behind the music: a dusty boom bap kit, an electric
 * piano, a round bass, and a lead that is either vibraphone or a soft
 * synth flute. Everything is kept low and round so it sits under the
 * squeaks and the crowd.
 */

function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 118, glideTo: 44, decay: 0.34, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 900, decay: 0.02, peak: peak * 0.2 });
}

function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1700, q: 0.6, decay: 0.2, peak });
  tone(engine, out, at, { type: "triangle", frequency: 185, glideTo: 150, decay: 0.09, peak: peak * 0.5 });
}

function hat(engine: AudioEngine, out: AudioNode, at: number, peak: number, open = false): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7200, decay: open ? 0.14 : 0.035, peak });
}

/** Electric piano: a sine with a quiet bell tine an octave up, rolled like fingers. */
function keys(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.016;
    tone(engine, out, t, { frequency: midi(note), attack: 0.008, decay: length, peak });
    tone(engine, out, t, { frequency: midi(note + 12), detune: 4, decay: length * 0.3, peak: peak * 0.22 });
  });
}

function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), attack: 0.01, decay: length, peak });
  tone(engine, out, at, { type: "triangle", frequency: midi(note + 12), attack: 0.01, decay: length * 0.5, peak: peak * 0.18 });
}

function lead(engine: AudioEngine, out: AudioNode, at: number, note: number, voice: Tune["lead"], peak: number): void {
  if (voice === "vibes") {
    // Two sines a hair apart beat against each other like the vibraphone's motor.
    tone(engine, out, at, { frequency: midi(note), decay: 1.1, peak });
    tone(engine, out, at, { frequency: midi(note), detune: 9, decay: 0.9, peak: peak * 0.5 });
    tone(engine, out, at, { frequency: midi(note + 24), decay: 0.18, peak: peak * 0.2 });
  } else {
    tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.03, decay: 0.42, peak });
    noise(engine, out, at, { filter: "bandpass", frequency: midi(note) * 2, q: 8, attack: 0.02, decay: 0.12, peak: peak * 0.3 });
  }
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const sixteenth = 60 / tune.bpm / 4;
  const inBar = step % 16;
  const bar = Math.floor(step / 16);
  const [root, ...chord] = tune.chords[bar % tune.chords.length]!;
  const inB = bar % 8 >= 4;
  // Every odd sixteenth is pushed late, which is where the lazy head nod comes from.
  const t = at + (inBar % 2 === 1 ? sixteenth * tune.swing : 0);

  const kicks = bar % 4 === 3 ? tune.kickFill : tune.kick;
  if (kicks.includes(inBar)) kick(engine, out, t, inBar === 0 ? 0.3 : 0.24);
  if (inBar === 4 || inBar === 12) snare(engine, out, t, tune.clap ? 0.09 : 0.075);
  if (tune.clap && (inBar === 4 || inBar === 12)) noise(engine, out, t + 0.012, { filter: "bandpass", frequency: 1300, q: 1.4, decay: 0.08, peak: 0.07 });
  if (bar % 4 === 3 && inBar === 15) snare(engine, out, t, 0.03);
  if (inBar % 2 === 0) hat(engine, out, t, inBar % 4 === 2 ? 0.03 : 0.018);
  if (inB && inBar === 14) hat(engine, out, t, 0.025, true);

  const b = tune.bass[inBar];
  if (b !== null && b !== undefined) bass(engine, out, t, root! + b, sixteenth * 3.5, 0.15);
  if (tune.keyHits.includes(inBar)) keys(engine, out, t, chord, sixteenth * (inBar === 0 ? 7 : 4), 0.022);

  const note = tune.hook[step % tune.hook.length];
  if (note !== null && note !== undefined) lead(engine, out, t, note, tune.lead, tune.lead === "vibes" ? 0.05 : 0.045);
}
