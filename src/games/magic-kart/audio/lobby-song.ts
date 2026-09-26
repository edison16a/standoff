import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, tone } from "@/platform/audio/voices";
import { drums, keys, pad, softLead } from "./kart-band";
import { phrase, type Chord, type Song } from "./song";

/**
 * "Paddock Sunset", the lobby tune, in D flat major at 84. Each chord
 * lasts two bars, so the pads swell and melt into each other with no
 * gap. An electric piano, a round sub bass and a soft half time kit sit
 * under a slow hummed melody. A takes the melody high, B answers it on
 * new chords and falls back to the top. Sixteen bars before it repeats.
 */

/** Dbmaj9, Bbm9, Gbmaj7, Ab7sus, then Gbmaj7, Fm7, Ebm9, Ab13sus. */
const CHORDS: Chord[] = [
  [37, 65, 68, 72, 75], [34, 61, 65, 68, 72], [42, 61, 65, 66, 70], [44, 61, 63, 66, 68],
  [42, 61, 65, 66, 70], [41, 60, 63, 65, 68], [39, 58, 61, 65, 66], [44, 63, 65, 66, 73],
];

const MELODY = phrase([
  [0, 77, 6], [6, 75, 2], [8, 73, 4], [12, 75, 4], [16, 68, 12],
  [32, 77, 6], [38, 80, 2], [40, 77, 4], [44, 75, 4], [48, 73, 12],
  [64, 70, 6], [70, 73, 2], [72, 77, 8], [80, 78, 4], [84, 77, 4], [88, 73, 8],
  [96, 75, 6], [102, 73, 2], [104, 70, 4], [108, 68, 4], [112, 75, 12],
]);

const ANSWER = phrase([
  [0, 82, 8], [8, 80, 4], [12, 77, 4], [16, 78, 12],
  [32, 77, 8], [40, 75, 4], [44, 72, 4], [48, 68, 12],
  [64, 73, 8], [72, 75, 4], [76, 77, 4], [80, 78, 8], [88, 77, 8],
  [96, 75, 12], [108, 72, 4], [112, 68, 8], [120, 75, 8],
]);

const BPM = 84;
const SIXTEENTH = 60 / BPM / 4;
const BAR = SIXTEENTH * 16;

function play(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 8;
  const chord = CHORDS[Math.floor(bar / 2)]!;
  const tones = chord.slice(1);

  if (inBar === 0 && bar % 2 === 0) pad(engine, out, at, tones, BAR * 2, 0.085);
  if (inBar === 0 || inBar === 10) keys(engine, out, at, tones, SIXTEENTH * (inBar === 0 ? 10 : 6), inBar === 0 ? 0.022 : 0.014);
  if (inBar === 0) tone(engine, out, at, { frequency: midi(chord[0]!), attack: 0.03, decay: SIXTEENTH * 9, peak: 0.17 });
  if (inBar === 10) tone(engine, out, at, { frequency: midi(chord[0]! + 7), attack: 0.03, decay: SIXTEENTH * 5, peak: 0.11 });

  // A lazy half time kit, low enough to feel rather than hear.
  if (inBar === 0 || inBar === 11) drums.kick(engine, out, at, 0.13);
  if (inBar === 8) drums.snare(engine, out, at, 0.03);
  if (inBar % 2 === 0) drums.hat(engine, out, at, inBar % 4 === 2 ? 0.014 : 0.008);

  const line = inB ? ANSWER.get(step - 128) : MELODY.get(step);
  if (line) softLead(engine, out, at, line.note, line.length * SIXTEENTH * 0.9, inB ? 0.04 : 0.045);
}

export const LOBBY_SONG: Song = { bpm: BPM, steps: 256, swing: 0.14, play };
