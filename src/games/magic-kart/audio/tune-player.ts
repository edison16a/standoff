import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { Tune } from "./tunes";

/**
 * Turns one sixteenth of a tune into notes, and plays the winner's
 * fanfare. Every map shares this small band so the mix stays the same
 * from track to track: soft drums, a round bass, a pad, chord stabs or an
 * arpeggio, and one lead voice.
 */

const LEAD_SHAPES: Record<Tune["leadVoice"], { type: OscillatorType; decay: number; peak: number; octave?: number }> = {
  steel: { type: "triangle", decay: 0.32, peak: 0.06, octave: 12 },
  pluck: { type: "triangle", decay: 0.2, peak: 0.055, octave: 12 },
  reed: { type: "sawtooth", decay: 0.34, peak: 0.018, octave: 0 },
  bell: { type: "sine", decay: 0.9, peak: 0.06, octave: 19 },
};

/** Soft enough to sit under the engines. The last bar of the loop rolls into the top with a fill. */
function drums(engine: AudioEngine, out: AudioNode, style: Tune["drums"], bar: number, step: number, at: number): void {
  const heavy = style === "heavy";
  const light = style === "light";
  // The first bar of B drops the kick for a breath before the answer line.
  const breath = bar === 4 && step > 0;
  const fill = bar === 7 && step >= 12;
  if (!light && !breath && step % 4 === 0) tone(engine, out, at, { frequency: heavy ? 110 : 130, glideTo: 42, decay: 0.22, peak: heavy ? 0.34 : 0.28 });
  if (light && step % 8 === 0) tone(engine, out, at, { frequency: 110, glideTo: 50, decay: 0.2, peak: 0.2 });
  if (fill) {
    noise(engine, out, at, { filter: "bandpass", frequency: 1500 + step * 60, q: 0.9, decay: 0.08, peak: 0.05 + (step - 12) * 0.015 });
  } else if (step % 8 === 4) {
    noise(engine, out, at, { filter: "bandpass", frequency: heavy ? 1400 : 1900, q: 0.8, decay: 0.14, peak: light ? 0.06 : 0.1 });
    tone(engine, out, at, { type: "triangle", frequency: 190, glideTo: 150, decay: 0.06, peak: light ? 0.03 : 0.06 });
  }
  if (step % 2 === 0) noise(engine, out, at, { filter: "highpass", frequency: 8000, decay: step % 4 === 2 ? 0.05 : 0.02, peak: light ? 0.022 : 0.035 });
  if (style === "pop" && (step === 3 || step === 11)) noise(engine, out, at, { filter: "bandpass", frequency: 4200, q: 4, decay: 0.03, peak: 0.05 });
}

/** Plays whatever falls on one sixteenth of the eight bar loop. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const sixteenth = 60 / tune.bpm / 4;
  const bar = Math.floor(step / 16) % 8;
  const inBar = step % 16;
  const inB = bar >= 4;
  const chord = (inB ? tune.chordsB : tune.chords)[bar % 4]!;
  drums(engine, out, tune.drums, bar, inBar, at);

  const bass = tune.bass[inBar];
  if (bass !== null && bass !== undefined) {
    const note = midi(chord[0]! + bass - 12);
    tone(engine, out, at, { type: "triangle", frequency: note, decay: sixteenth * 1.8, peak: 0.07 });
    tone(engine, out, at, { frequency: note, decay: sixteenth * 2.2, peak: 0.13 });
  }
  const tones = chord.slice(1);
  // B plays the arpeggio where A stabbed, and the other way round, so the texture turns over too.
  const arp = inB ? !tune.arp : tune.arp;
  if (arp) {
    if (inBar % 2 === 0) tone(engine, out, at, { type: "triangle", frequency: midi(tones[(inBar / 2) % tones.length]! + 12), decay: sixteenth * 2.5, peak: 0.028 });
  } else if (inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14) {
    for (const note of tones) tone(engine, out, at, { type: "triangle", frequency: midi(note), decay: sixteenth * 1.8, peak: 0.02 });
  }
  if (inBar === 0) for (const note of tones) tone(engine, out, at, { frequency: midi(note), attack: 0.25, decay: sixteenth * 15, peak: inB ? 0.024 : 0.016 });

  const lead = inB ? tune.leadB[(step - 64) % tune.leadB.length] : tune.lead[step % tune.lead.length];
  if (lead === null || lead === undefined) return;
  const shape = LEAD_SHAPES[tune.leadVoice];
  // The answer line rings longer, which is most of what makes B feel like a new place.
  const decay = shape.decay * (inB ? 1.6 : 1);
  tone(engine, out, at, { type: shape.type, frequency: midi(lead), decay, peak: shape.peak });
  if (shape.octave !== undefined) tone(engine, out, at, { frequency: midi(lead + shape.octave), decay: decay * 0.6, peak: shape.octave ? shape.peak * 0.35 : 0.045 });
}

/** The winner's fanfare: a bright rising run into a held major chord. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [60, 64, 67, 72, 76, 79].forEach((note, i) => {
    tone(engine, out, at + i * 0.1, { type: "triangle", frequency: midi(note), attack: 0.01, decay: 0.25, peak: 0.1 });
    tone(engine, out, at + i * 0.1, { frequency: midi(note + 12), attack: 0.01, decay: 0.25, peak: 0.05 });
  });
  const held = at + 0.65;
  for (const note of [72, 76, 79, 84]) {
    tone(engine, out, held, { type: "sawtooth", frequency: midi(note), attack: 0.03, decay: 2.2, peak: 0.02 });
    tone(engine, out, held, { type: "triangle", frequency: midi(note), attack: 0.03, decay: 2.4, peak: 0.035, detune: 6 });
  }
  tone(engine, out, held, { frequency: midi(48), attack: 0.02, decay: 2.4, peak: 0.2 });
  tone(engine, out, held, { frequency: 150, glideTo: 45, decay: 0.3, peak: 0.25 });
  noise(engine, out, held, { filter: "highpass", frequency: 6000, decay: 1.5, peak: 0.1 });
}
