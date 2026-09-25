import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The music as step patterns: sixteen sixteenths a bar, a chord a bar.
 * The run tune is a bouncy hip hop groove with a whistled hook, the
 * menu tune the same band laid back.
 */
export interface Tune {
  bpm: number;
  /** Chord tones per bar, as MIDI notes. The first is the bass root. */
  chords: number[][];
  /** The hook, one entry per sixteenth across all bars, null for a rest. */
  lead: (number | null)[];
  /** Which sixteenths the bass plays, and how many semitones above the root. */
  bass: (number | null)[];
  /** Full drums, or just a soft kick and hats. */
  busy: boolean;
}

const _ = null;

export const TUNES: Record<"menu" | "run", Tune> = {
  menu: {
    bpm: 96,
    chords: [[45, 64, 67, 72], [41, 65, 69, 72], [43, 62, 67, 71], [40, 64, 67, 71]],
    lead: [76, _, _, 79, _, _, 76, _, 74, _, _, _, 72, _, _, _, _, _, _, _, 74, _, 76, _, 79, _, _, _, _, _, _, _,
      76, _, _, 79, _, _, 81, _, 79, _, _, _, 76, _, 74, _, 72, _, _, _, 71, _, _, _, 72, _, _, _, _, _, _, _],
    bass: [0, _, _, _, _, _, 0, _, _, _, 7, _, _, _, _, _],
    busy: false,
  },
  run: {
    bpm: 124,
    chords: [[48, 64, 67, 72], [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]],
    lead: [84, _, 84, _, 79, _, 81, _, 84, _, _, 86, _, 84, _, _, 81, _, 81, _, 76, _, 79, _, 81, _, _, 79, _, 76, _, _,
      77, _, 77, _, 81, _, 84, _, 86, _, _, 84, _, 81, _, _, 79, _, 81, _, 79, _, 76, _, 74, _, _, _, 79, _, _, _],
    bass: [0, _, _, 0, _, _, 12, _, 0, _, 0, _, 7, _, 12, _],
    busy: true,
  },
};

function drums(engine: AudioEngine, out: AudioNode, busy: boolean, step: number, at: number): void {
  // A boom bap kick, a clap on two and four, and swung hats.
  const kick = busy ? step === 0 || step === 7 || step === 10 : step === 0 || step === 10;
  if (kick) tone(engine, out, at, { type: "sine", frequency: 140, glideTo: 40, decay: 0.24, peak: busy ? 0.55 : 0.3 });
  if (busy && (step === 4 || step === 12)) {
    noise(engine, out, at, { filter: "bandpass", frequency: 1600, q: 0.9, decay: 0.16, peak: 0.26 });
    noise(engine, out, at + 0.012, { filter: "bandpass", frequency: 2200, q: 1.2, decay: 0.1, peak: 0.12 });
  }
  if (step % 2 === 0) noise(engine, out, at, { filter: "highpass", frequency: 8000, decay: step % 4 === 2 ? 0.07 : 0.03, peak: busy ? 0.06 : 0.03 });
  if (busy && step === 15) noise(engine, out, at, { filter: "highpass", frequency: 6000, decay: 0.12, peak: 0.05 });
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const sixteenth = 60 / tune.bpm / 4;
  const bar = Math.floor(step / 16) % tune.chords.length;
  const inBar = step % 16;
  const chord = tune.chords[bar]!;
  drums(engine, out, tune.busy, inBar, at);

  const bass = tune.bass[inBar];
  if (bass !== null && bass !== undefined) {
    const f = midi(chord[0]! + bass - 12);
    tone(engine, out, at, { type: "square", frequency: f, decay: sixteenth * 1.4, peak: 0.045 });
    tone(engine, out, at, { type: "sine", frequency: f, decay: sixteenth * 2.2, peak: 0.16 });
  }
  // Offbeat chord stabs, like a steel drum band.
  const tones = chord.slice(1);
  if (inBar % 4 === 2) for (const note of tones) tone(engine, out, at, { type: "triangle", frequency: midi(note), decay: sixteenth * 1.6, peak: tune.busy ? 0.03 : 0.022 });

  const lead = tune.lead[step % tune.lead.length];
  if (lead !== null && lead !== undefined) {
    // A whistle: a pure tone with a slight scoop up into the note.
    tone(engine, out, at, { type: "sine", frequency: midi(lead - 0.4), glideTo: midi(lead), decay: sixteenth * 2.4, peak: tune.busy ? 0.07 : 0.05 });
    tone(engine, out, at, { type: "triangle", frequency: midi(lead + 12), decay: sixteenth * 1.2, peak: 0.012 });
  }
}

/** A bright rising run into a held major chord, for the results. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [60, 64, 67, 72, 76, 79].forEach((note, i) => {
    tone(engine, out, at + i * 0.09, { type: "square", frequency: midi(note), attack: 0.01, decay: 0.2, peak: 0.05 });
    tone(engine, out, at + i * 0.09, { type: "triangle", frequency: midi(note + 12), attack: 0.01, decay: 0.25, peak: 0.05 });
  });
  const held = at + 0.6;
  for (const note of [72, 76, 79, 84]) tone(engine, out, held, { type: "sawtooth", frequency: midi(note), attack: 0.03, decay: 2, peak: 0.04 });
  tone(engine, out, held, { type: "sine", frequency: midi(48), attack: 0.02, decay: 2.2, peak: 0.28 });
  noise(engine, out, held, { filter: "highpass", frequency: 6000, decay: 1.4, peak: 0.1 });
}
