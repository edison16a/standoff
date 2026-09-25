import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { LeadVoice, Tune } from "./tunes";

/**
 * The band behind the music: a punchy kit, a round bass, a soft
 * arpeggio and a lead in one of four voices. Everything is rounded off
 * with sines and triangles so it drives without ever sounding harsh.
 */

function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 130, glideTo: 45, decay: 0.26, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 1200, decay: 0.015, peak: peak * 0.25 });
}

function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 0.7, decay: 0.16, peak });
  noise(engine, out, at + 0.01, { filter: "bandpass", frequency: 1200, q: 1.4, decay: 0.07, peak: peak * 0.8 });
  tone(engine, out, at, { type: "triangle", frequency: 200, glideTo: 160, decay: 0.08, peak: peak * 0.5 });
}

function hat(engine: AudioEngine, out: AudioNode, at: number, peak: number, open = false): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7500, decay: open ? 0.12 : 0.03, peak });
}

function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.006, decay: length, peak });
  tone(engine, out, at, { frequency: midi(note - 12), attack: 0.006, decay: length * 0.8, peak: peak * 0.6 });
}

function lead(engine: AudioEngine, out: AudioNode, at: number, note: number, voice: LeadVoice, peak: number): void {
  const f = midi(note);
  switch (voice) {
    case "pluck":
      tone(engine, out, at, { type: "triangle", frequency: f, decay: 0.32, peak });
      tone(engine, out, at, { type: "square", frequency: f, detune: 6, decay: 0.12, peak: peak * 0.18 });
      return;
    case "bell":
      tone(engine, out, at, { frequency: f, decay: 0.8, peak });
      tone(engine, out, at, { frequency: f * 2.76, decay: 0.25, peak: peak * 0.25 });
      return;
    case "crystal":
      tone(engine, out, at, { frequency: f, decay: 0.6, peak });
      tone(engine, out, at, { frequency: f * 3, decay: 0.3, peak: peak * 0.2 });
      tone(engine, out, at + 0.09, { frequency: f * 2, decay: 0.3, peak: peak * 0.2 });
      return;
    case "flute":
      tone(engine, out, at, { type: "triangle", frequency: f, attack: 0.03, decay: 0.38, peak });
      noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 8, attack: 0.02, decay: 0.1, peak: peak * 0.35 });
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
  const fill = bar % 4 === 3;

  if ((fill ? tune.kickFill : tune.kick).includes(inBar)) kick(engine, out, t, inBar === 0 ? 0.32 : 0.26);
  if (inBar === 4 || inBar === 12) snare(engine, out, t, 0.08);
  if (fill && inBar >= 13) snare(engine, out, t, 0.03 + (inBar - 13) * 0.012);
  if (inBar % 2 === 0) hat(engine, out, t, inBar % 4 === 2 ? 0.03 : 0.016, tune.arp && inBar % 4 === 2);

  const b = tune.bass[inBar];
  if (b !== null && b !== undefined) bass(engine, out, t, root! + k + b, sixteenth * 1.8, 0.13);
  if (tune.arp && chord.length) {
    const note = chord[inBar % chord.length]! + k + (inBar % 8 >= 4 ? 12 : 0);
    tone(engine, out, t, { type: "triangle", frequency: midi(note), decay: sixteenth * 1.4, peak: 0.018 });
  } else if (inBar === 0 || inBar === 8) {
    for (const note of chord) tone(engine, out, t, { frequency: midi(note + k), attack: 0.01, decay: sixteenth * 7, peak: 0.018 });
  }

  const note = tune.hook[step % tune.hook.length];
  if (note !== null && note !== undefined) lead(engine, out, t, note + k, tune.lead, 0.055);
}
