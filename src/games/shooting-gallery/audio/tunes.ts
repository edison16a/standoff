import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * Two fairground tunes, written as step sequences, played on a little
 * steam organ voice: an oom pah pah waltz for the lobby and a quick polka
 * for the round. A track is told "step n starts at time t" and books
 * whatever plays there.
 */
export interface Track {
  /** Seconds per step. */
  step: number;
  length: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

/** A calliope pipe: a soft triangle with a reedy square an octave up and a slow beat between them. */
function pipe(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const frequency = midi(note);
  tone(engine, out, at, { type: "triangle", frequency, attack: 0.012, decay: length, peak });
  tone(engine, out, at, { type: "square", frequency: frequency * 2, attack: 0.02, decay: length * 0.8, peak: peak * 0.16, detune: 7 });
  tone(engine, out, at, { type: "sine", frequency: frequency * 1.004, attack: 0.02, decay: length, peak: peak * 0.45 });
}

function bass(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number): void {
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.008, decay: length, peak: 0.2 });
  tone(engine, out, at, { type: "square", frequency: midi(note), attack: 0.008, decay: length * 0.6, peak: 0.025 });
}

const F = [65, 69, 72];
const C7 = [64, 67, 70];
const BB = [65, 70, 74];
const ROOT: Record<string, [number, number]> = { F: [41, 36], C7: [36, 43], BB: [34, 41], C: [36, 43], G7: [43, 38], FF: [41, 36] };

/* The lobby waltz, in F: three beats a bar, two steps a beat. */
const WALTZ_BARS: [string, number[], (number | null)[]][] = [
  ["F", F, [72, null, 77, null, 81, null]],
  ["F", F, [81, null, null, null, 79, 77]],
  ["C7", C7, [76, null, 79, null, 82, null]],
  ["C7", C7, [82, null, null, null, 81, 79]],
  ["C7", C7, [79, null, 76, null, 72, null]],
  ["C7", C7, [74, null, 76, null, 77, null]],
  ["F", F, [81, null, 77, null, 72, null]],
  ["F", F, [77, null, null, null, null, null]],
  ["F", F, [72, null, 77, null, 81, null]],
  ["F", F, [84, null, null, null, 81, 77]],
  ["BB", BB, [82, null, 81, null, 79, null]],
  ["BB", BB, [77, null, 74, null, 70, null]],
  ["F", F, [72, null, 77, null, 81, null]],
  ["C7", C7, [79, null, 76, null, 72, null]],
  ["C7", C7, [76, null, 79, null, 76, null]],
  ["F", F, [77, null, null, null, null, null]],
];

export const WALTZ: Track = {
  step: 60 / 150 / 2,
  length: WALTZ_BARS.length * 6,
  play(engine, out, step, at) {
    const [name, chord, melody] = WALTZ_BARS[Math.floor(step / 6)]!;
    const inBar = step % 6;
    const beat = 60 / 150;
    if (inBar === 0) bass(engine, out, ROOT[name]![Math.floor(step / 6) % 2]!, at, beat * 0.9);
    if (inBar === 2 || inBar === 4) for (const note of chord) pipe(engine, out, note, at, beat * 0.5, 0.022);
    const note = melody[inBar];
    if (note) pipe(engine, out, note, at, beat * (melody[inBar + 1] === null ? 1.5 : 0.7), 0.06);
  },
};

const C = [64, 67, 72];
const G7 = [62, 65, 71];
const FC = [65, 69, 72];

/* The round polka, in C: oom pah on eighth notes, a busy tune on top. */
const POLKA_BARS: [string, number[], (number | null)[]][] = [
  ["C", C, [67, 72, 76, 72]],
  ["C", C, [79, null, 76, null]],
  ["G7", G7, [74, 77, 79, 77]],
  ["G7", G7, [74, null, 71, null]],
  ["G7", G7, [71, 74, 77, 74]],
  ["G7", G7, [79, 77, 76, 74]],
  ["C", C, [72, 76, 79, 84]],
  ["C", C, [84, null, null, null]],
  ["C", C, [76, 79, 84, 79]],
  ["C", C, [76, null, 72, null]],
  ["FF", FC, [77, 81, 84, 81]],
  ["FF", FC, [77, null, 72, null]],
  ["C", C, [76, 79, 76, 72]],
  ["G7", G7, [74, 77, 74, 71]],
  ["C", C, [72, 74, 76, 79]],
  ["C", C, [84, null, 72, null]],
];

export const POLKA: Track = {
  step: 60 / 138 / 2,
  length: POLKA_BARS.length * 4,
  play(engine, out, step, at) {
    const [name, chord, melody] = POLKA_BARS[Math.floor(step / 4)]!;
    const inBar = step % 4;
    const eighth = 60 / 138 / 2;
    if (inBar === 0 || inBar === 2) bass(engine, out, ROOT[name]![inBar / 2]!, at, eighth * 0.9);
    if (inBar === 1 || inBar === 3) {
      for (const note of chord) pipe(engine, out, note, at, eighth * 0.6, 0.02);
      noise(engine, out, at, { filter: "highpass", frequency: 7000, decay: 0.04, peak: 0.05 });
    }
    const note = melody[inBar];
    if (note) pipe(engine, out, note, at, eighth * (melody[inBar + 1] === null ? 1.8 : 0.85), 0.055);
  },
};

/** A short brass band flourish for the winner. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [72, 76, 79, 84].forEach((note, i) => pipe(engine, out, note, at + i * 0.12, 0.25, 0.09));
  for (const note of [72, 76, 79, 84]) pipe(engine, out, note, at + 0.5, 1.4, 0.05);
  bass(engine, out, 36, at + 0.5, 1.4);
}
