import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, tone } from "@/platform/audio/voices";
import { drums, funkBass, pad, stab, synthLead } from "./kart-band";
import { phrase, type Chord, type Song } from "./song";

/**
 * "Turbo Bloom", the one race song, in B minor at 140. Sixteen bars: the
 * A section is the synth hook over a busy funk bass, the B section climbs
 * on long notes over brass stabs and a rolling arpeggio, and a snare
 * fill and a riser pull the last bar back into the hook. On the final
 * lap the intensity rises: the hats double up, the kick and clap push
 * harder, the arpeggio plays all the way through and the lead gains an
 * octave above it.
 */

/** Bm9, Gmaj7, D, A twice, then Em7, F#m7, G, A and Em7, F#m7, G, F#. */
const CHORDS: Chord[] = [
  [47, 62, 66, 69, 73], [43, 62, 66, 67, 71], [38, 62, 66, 69], [45, 61, 64, 69],
  [47, 62, 66, 69, 73], [43, 62, 66, 67, 71], [38, 62, 66, 69], [45, 61, 64, 69],
  [40, 62, 64, 67, 71], [42, 61, 64, 66, 69], [43, 62, 67, 71], [45, 61, 64, 69],
  [40, 62, 64, 67, 71], [42, 61, 64, 66, 69], [43, 62, 67, 71], [42, 61, 66, 70],
];

/** The hook, then the hook again with a higher, wider ending. */
const HOOK = phrase([
  [0, 78, 2], [3, 78, 1], [4, 81, 2], [6, 83, 4], [10, 81, 2], [12, 78, 2], [14, 76, 2],
  [16, 74, 3], [19, 76, 1], [20, 78, 4], [26, 74, 2], [28, 71, 4],
  [32, 78, 2], [35, 78, 1], [36, 81, 2], [38, 85, 4], [42, 83, 2], [44, 81, 2], [46, 78, 2],
  [48, 76, 6], [54, 73, 2], [56, 76, 2], [58, 78, 2], [60, 81, 4],
  [64, 78, 2], [67, 78, 1], [68, 81, 2], [70, 83, 4], [74, 81, 2], [76, 78, 2], [78, 76, 2],
  [80, 74, 3], [83, 76, 1], [84, 78, 4], [90, 74, 2], [92, 71, 4],
  [96, 78, 2], [98, 81, 2], [100, 86, 4], [106, 85, 2], [108, 83, 2], [110, 81, 2],
  [112, 83, 6], [118, 81, 2], [120, 78, 2], [122, 76, 2], [124, 73, 4],
]);

/** The B section's climbing answer, in long notes. */
const ANSWER = phrase([
  [0, 79, 6], [6, 78, 2], [8, 76, 4], [12, 71, 4],
  [16, 73, 6], [22, 76, 2], [24, 78, 8],
  [32, 79, 4], [36, 83, 4], [40, 86, 4], [44, 83, 4],
  [48, 85, 8], [56, 81, 4], [60, 76, 4],
  [64, 79, 6], [70, 78, 2], [72, 76, 4], [76, 79, 4],
  [80, 81, 6], [86, 78, 2], [88, 73, 8],
  [96, 74, 4], [100, 79, 4], [104, 83, 6], [110, 86, 2],
  [112, 85, 8], [120, 82, 4], [124, 78, 4],
]);

/** The funk bass line: [step, semitones over the root, length]. */
const BASS = phrase([[0, 0, 2], [3, 12, 1], [4, 0, 1], [6, 7, 1], [8, 0, 2], [10, 12, 1], [11, 7, 1], [14, 0, 1]]);

const BPM = 140;
const SIXTEENTH = 60 / BPM / 4;

function groove(engine: AudioEngine, out: AudioNode, bar: number, inBar: number, at: number, hot: boolean): void {
  const inB = bar >= 8;
  const fill = bar === 15 && inBar >= 12;
  if (inBar === 0 || inBar === 6 || inBar === 10 || (hot && (inBar === 8 || inBar === 14))) drums.kick(engine, out, at, 0.22);
  if (inBar === 4 || inBar === 12) {
    drums.snare(engine, out, at, 0.1);
    if (hot || inB) drums.clap(engine, out, at, 0.05);
  }
  if (fill) drums.snare(engine, out, at, 0.04 + (inBar - 12) * 0.02);
  if (inBar === 14 && !fill) drums.hat(engine, out, at, 0.03, true);
  else if (inBar % 2 === 0) drums.hat(engine, out, at, inBar % 4 === 2 ? 0.032 : 0.02);
  else if (hot) drums.hat(engine, out, at, 0.012);
  // Risers lead into B and back into the hook, so the loop's seam sounds like a lift, not a restart.
  if ((bar === 7 || bar === 15) && inBar === 8) drums.riser(engine, out, at, SIXTEENTH * 8, 0.05);
}

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, intensity: number): void {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 8;
  const hot = intensity > 0.5;
  const chord = CHORDS[bar]!;
  const next = CHORDS[(bar + 1) % CHORDS.length]!;
  groove(engine, out, bar, inBar, at, hot);

  if (inBar === 0) pad(engine, out, at, chord.slice(1), SIXTEENTH * 16, inB ? 0.05 : 0.04);
  const bass = BASS.get(inBar);
  if (bass) funkBass(engine, out, at, chord[0]! + bass.note, bass.length * SIXTEENTH, 0.1);
  // A chromatic lean into the next root on the last sixteenth.
  if (inBar === 15) funkBass(engine, out, at, next[0]! - 1, SIXTEENTH * 0.8, 0.07);
  if (hot && (inBar === 12 || inBar === 13)) funkBass(engine, out, at, chord[0]! + (inBar === 12 ? 12 : 7), SIXTEENTH * 0.8, 0.07);

  if (inB && (inBar === 0 || inBar === 3 || inBar === 10)) stab(engine, out, at, chord.slice(1), 0.05);
  if (inB || hot) {
    const tones = chord.slice(1);
    tone(engine, out, at, { type: "triangle", frequency: midi(tones[inBar % tones.length]! + 12), decay: SIXTEENTH * 1.6, peak: 0.016 });
  }

  const line = inB ? ANSWER.get(step - 128) : HOOK.get(step);
  if (!line) return;
  synthLead(engine, out, at, line.note, line.length * SIXTEENTH * 0.9, inB ? 0.06 : 0.07);
  if (hot) synthLead(engine, out, at, line.note + 12, line.length * SIXTEENTH * 0.9, 0.025);
}

export const RACE_SONG: Song = { bpm: BPM, steps: 256, swing: 0.04, play };
