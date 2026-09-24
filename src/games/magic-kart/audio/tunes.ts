import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The music, written as step patterns: sixteen sixteenth notes a bar,
 * one chord per bar. Each map has its own tune in its own mood, sharing
 * one small band of synth voices so the mix stays consistent.
 */
export interface Tune {
  bpm: number;
  /** Chord tones per bar, as MIDI notes. The first is the bass root. */
  chords: number[][];
  /** Lead line, one entry per sixteenth across all bars, null for a rest. */
  lead: (number | null)[];
  leadVoice: "steel" | "square" | "saw" | "bell";
  /** Which sixteenths the bass plays, and how many semitones above the root. */
  bass: (number | null)[];
  drums: "light" | "pop" | "drive" | "heavy";
  /** Plays chord tones as a rolling arpeggio instead of stabs. */
  arp: boolean;
}

const _ = null;

export const TUNES: Record<"lobby" | "beach" | "space" | "city" | "volcano", Tune> = {
  lobby: {
    bpm: 100,
    chords: [[53, 65, 69, 72], [50, 62, 65, 69], [46, 62, 65, 70], [48, 64, 67, 70]],
    lead: [81, _, _, 79, _, 77, _, _, 76, _, 77, _, 79, _, _, _, 74, _, _, 76, _, 77, _, _, 81, _, _, _, 79, _, _, _,
      77, _, _, 79, _, 81, _, _, 82, _, 81, _, 79, _, 77, _, 76, _, _, _, 72, _, _, _, 76, _, _, _, _, _, _, _],
    leadVoice: "bell",
    bass: [0, _, _, _, _, _, 7, _, 0, _, _, _, 12, _, _, _],
    drums: "light",
    arp: true,
  },
  beach: {
    bpm: 128,
    chords: [[48, 64, 67, 72], [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]],
    lead: [79, _, 76, _, 79, _, 81, 79, _, 76, _, 72, _, 74, 76, _, 76, _, 72, _, 76, _, 79, _, 81, _, 79, _, 76, _, _, _,
      77, _, 76, _, 72, _, 69, _, 72, _, 77, 76, _, 72, _, _, 74, _, 71, _, 74, _, 79, _, 77, _, 74, _, 71, _, 67, _],
    leadVoice: "steel",
    bass: [0, _, _, 0, _, _, 7, _, 0, _, _, 0, _, 7, _, 12],
    drums: "pop",
    arp: false,
  },
  space: {
    bpm: 118,
    chords: [[45, 60, 64, 69], [41, 60, 65, 69], [43, 62, 67, 71], [40, 59, 64, 68]],
    lead: [76, _, _, _, 72, _, _, _, 74, _, 76, _, 79, _, _, _, 77, _, _, _, 76, _, _, _, 72, _, _, _, _, _, _, _,
      74, _, _, _, 79, _, _, _, 83, _, 81, _, 79, _, _, _, 80, _, _, _, 76, _, _, _, 71, _, 74, _, 76, _, _, _],
    leadVoice: "saw",
    bass: [0, _, 0, _, 12, _, 0, _, 0, _, 0, _, 12, _, 7, _],
    drums: "drive",
    arp: true,
  },
  city: {
    bpm: 132,
    chords: [[40, 59, 64, 67], [36, 60, 64, 67], [43, 62, 67, 71], [38, 62, 66, 69]],
    lead: [76, _, 76, _, 79, _, 76, _, 74, _, 71, _, 74, _, 76, _, 76, _, 76, _, 79, _, 81, _, 79, _, 76, _, 74, _, _, _,
      79, _, 79, _, 83, _, 79, _, 78, _, 74, _, 78, _, 79, _, 81, _, 78, _, 74, _, 69, _, 71, _, 74, _, 78, _, _, _],
    leadVoice: "square",
    bass: [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12],
    drums: "drive",
    arp: false,
  },
  volcano: {
    bpm: 136,
    chords: [[38, 62, 65, 69], [39, 63, 67, 70], [38, 62, 65, 69], [36, 60, 64, 67]],
    lead: [74, _, _, 74, 75, _, 74, _, 72, _, 69, _, 70, _, 69, _, 67, _, _, _, 69, _, 70, _, 69, _, _, _, _, _, _, _,
      74, _, _, 74, 77, _, 75, _, 74, _, 72, _, 70, _, 72, _, 74, _, 70, _, 69, _, 67, _, 69, _, _, _, 62, _, _, _],
    leadVoice: "saw",
    bass: [0, _, 0, 0, _, 0, 12, _, 0, _, 0, 0, _, 1, 0, _],
    drums: "heavy",
    arp: false,
  },
};

const LEAD_SHAPES: Record<Tune["leadVoice"], { type: OscillatorType; decay: number; peak: number; octave?: number }> = {
  steel: { type: "triangle", decay: 0.32, peak: 0.075, octave: 12 },
  square: { type: "square", decay: 0.18, peak: 0.035 },
  saw: { type: "sawtooth", decay: 0.3, peak: 0.03 },
  bell: { type: "sine", decay: 0.9, peak: 0.07, octave: 19 },
};

function drums(engine: AudioEngine, out: AudioNode, style: Tune["drums"], step: number, at: number): void {
  const heavy = style === "heavy";
  if (step % 4 === 0 && style !== "light") tone(engine, out, at, { type: "sine", frequency: heavy ? 120 : 150, glideTo: 42, decay: 0.2, peak: heavy ? 0.6 : 0.45 });
  if (style === "light" && step % 8 === 0) tone(engine, out, at, { type: "sine", frequency: 110, glideTo: 50, decay: 0.2, peak: 0.25 });
  if (step % 8 === 4) noise(engine, out, at, { filter: "bandpass", frequency: heavy ? 1400 : 2000, q: 0.8, decay: 0.15, peak: style === "light" ? 0.08 : 0.22 });
  if (step % 2 === 0) noise(engine, out, at, { filter: "highpass", frequency: 8500, decay: step % 4 === 2 ? 0.06 : 0.025, peak: style === "light" ? 0.03 : 0.07 });
  if (style === "pop" && (step === 3 || step === 11)) noise(engine, out, at, { filter: "bandpass", frequency: 5000, q: 3, decay: 0.03, peak: 0.08 });
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const sixteenth = 60 / tune.bpm / 4;
  const bar = Math.floor(step / 16) % tune.chords.length;
  const inBar = step % 16;
  const chord = tune.chords[bar]!;
  drums(engine, out, tune.drums, inBar, at);

  const bass = tune.bass[inBar];
  if (bass !== null && bass !== undefined) {
    tone(engine, out, at, { type: "sawtooth", frequency: midi(chord[0]! + bass - 12), decay: sixteenth * 1.7, peak: 0.07 });
    tone(engine, out, at, { type: "sine", frequency: midi(chord[0]! + bass - 12), decay: sixteenth * 2, peak: 0.12 });
  }
  const tones = chord.slice(1);
  if (tune.arp) {
    if (inBar % 2 === 0) tone(engine, out, at, { type: "triangle", frequency: midi(tones[(inBar / 2) % tones.length]! + 12), decay: sixteenth * 2.5, peak: 0.035 });
  } else if (inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14) {
    for (const note of tones) tone(engine, out, at, { type: "triangle", frequency: midi(note), decay: sixteenth * 1.8, peak: 0.025 });
  }
  if (inBar === 0) for (const note of tones) tone(engine, out, at, { type: "sine", frequency: midi(note), attack: 0.2, decay: sixteenth * 15, peak: 0.018 });

  const lead = tune.lead[step % tune.lead.length];
  if (lead !== null && lead !== undefined) {
    const shape = LEAD_SHAPES[tune.leadVoice];
    tone(engine, out, at, { type: shape.type, frequency: midi(lead), decay: shape.decay, peak: shape.peak });
    if (shape.octave) tone(engine, out, at, { type: "sine", frequency: midi(lead + shape.octave), decay: shape.decay * 0.6, peak: shape.peak * 0.35 });
  }
}

/** The winner's fanfare: a bright rising run into a held major chord. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [60, 64, 67, 72, 76, 79].forEach((note, i) => {
    tone(engine, out, at + i * 0.1, { type: "square", frequency: midi(note), attack: 0.01, decay: 0.22, peak: 0.06 });
    tone(engine, out, at + i * 0.1, { type: "triangle", frequency: midi(note + 12), attack: 0.01, decay: 0.25, peak: 0.05 });
  });
  const held = at + 0.65;
  for (const note of [72, 76, 79, 84]) tone(engine, out, held, { type: "sawtooth", frequency: midi(note), attack: 0.03, decay: 2.2, peak: 0.045 });
  tone(engine, out, held, { type: "sine", frequency: midi(48), attack: 0.02, decay: 2.4, peak: 0.3 });
  noise(engine, out, held, { filter: "highpass", frequency: 6000, decay: 1.5, peak: 0.12 });
}
