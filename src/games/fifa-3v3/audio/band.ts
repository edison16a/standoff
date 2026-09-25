import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { Tune } from "./tunes";

/**
 * The beach band behind the music: hand percussion, a nylon guitar, a
 * round bass, and a marimba or a steel pan on the hook. Sunny and light,
 * a world away from the arena's boom bap.
 */

function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 105, glideTo: 46, decay: 0.26, peak });
}

/** The big samba drum, felt more than heard. */
function surdo(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 82, glideTo: 66, decay: 0.45, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 500, decay: 0.05, peak: peak * 0.2 });
}

function shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 6000, q: 1.2, attack: 0.012, decay: 0.05, peak });
}

function rimClick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 2400, q: 4, decay: 0.025, peak });
  tone(engine, out, at, { type: "triangle", frequency: 1650, decay: 0.03, peak: peak * 0.3 });
}

function conga(engine: AudioEngine, out: AudioNode, at: number, high: boolean, peak: number): void {
  const f = high ? 330 : 220;
  tone(engine, out, at, { frequency: f * 1.08, glideTo: f, decay: 0.16, peak });
  noise(engine, out, at, { filter: "bandpass", frequency: 1200, q: 1.5, decay: 0.02, peak: peak * 0.4 });
}

/** Nylon strings: short triangle plucks, strummed a few milliseconds apart. */
function guitar(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], peak: number): void {
  notes.forEach((note, i) => {
    tone(engine, out, at + i * 0.012, { type: "triangle", frequency: midi(note), attack: 0.004, decay: 0.38, peak });
    tone(engine, out, at + i * 0.012, { frequency: midi(note + 12), decay: 0.08, peak: peak * 0.3 });
  });
}

function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number, drop: boolean): void {
  // The afro house log drum falls into its note; the bossa bass just sits on it.
  tone(engine, out, at, { frequency: midi(note) * (drop ? 1.5 : 1), glideTo: drop ? midi(note) : undefined, attack: 0.008, decay: length, peak });
  tone(engine, out, at, { type: "triangle", frequency: midi(note + 12), decay: length * 0.4, peak: peak * 0.15 });
}

function lead(engine: AudioEngine, out: AudioNode, at: number, note: number, voice: Tune["lead"], peak: number): void {
  const f = midi(note);
  if (voice === "marimba") {
    // A wooden bar: the fundamental and a quick knock near the fourth partial.
    tone(engine, out, at, { frequency: f, attack: 0.003, decay: 0.5, peak });
    tone(engine, out, at, { frequency: f * 3.93, decay: 0.05, peak: peak * 0.25 });
  } else {
    // A steel pan: bright octave and twelfth partials that fade before the note.
    tone(engine, out, at, { frequency: f, attack: 0.004, decay: 0.55, peak });
    tone(engine, out, at, { frequency: f * 2, detune: 6, decay: 0.3, peak: peak * 0.4 });
    tone(engine, out, at, { frequency: f * 3, decay: 0.12, peak: peak * 0.15 });
  }
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const sixteenth = 60 / tune.bpm / 4;
  const inBar = step % 16;
  const bar = Math.floor(step / 16);
  const [root, ...chord] = tune.chords[bar % tune.chords.length]!;
  const inB = bar % 8 >= 4;
  const afro = tune.groove === "afro";

  if (afro ? inBar % 4 === 0 : inBar === 0 || inBar === 10) kick(engine, out, at, afro ? 0.24 : 0.18);
  if (!afro && (inBar === 4 || inBar === 12)) surdo(engine, out, at, 0.2);
  if (afro && inBar % 4 === 2) noise(engine, out, at, { filter: "highpass", frequency: 7000, decay: 0.1, peak: 0.028 });
  if (afro && (inBar === 4 || inBar === 12)) rimClick(engine, out, at, 0.06);
  shaker(engine, out, at, inBar % 2 === 1 ? 0.03 : 0.016);
  // The bossa clave, a three then a two, is what makes it lilt.
  if (!afro && [0, 3, 6, 10, 12].includes(inBar)) rimClick(engine, out, at, 0.05);
  if (tune.congas.includes(inBar) || (inB && inBar === 15)) conga(engine, out, at, inBar % 4 !== 0, 0.08);

  const b = tune.bass[inBar];
  if (b !== null && b !== undefined) bass(engine, out, at, root! + b, sixteenth * 3, 0.16, afro);
  if (tune.strums.includes(inBar)) guitar(engine, out, at, chord, 0.024);

  const note = tune.hook[step % tune.hook.length];
  if (note !== null && note !== undefined) lead(engine, out, at, note, tune.lead, 0.055);
}
