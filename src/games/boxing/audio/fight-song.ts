import type { AudioEngine } from "@/platform/audio/audio-engine";
import { horn, kit, rhodes, sub } from "./band";
import { grit, loop, scratch, stab } from "./grit";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Corner Work": the fight, a gritty boom bap tune in C minor at 88.
 * Sixteen bars: a two horn section blows the hook through the A section,
 * then in the B section a lone horn answers while the section punches
 * stabs under it. A hot, clipped kit, a sub bass, a dusty piano chop and
 * a record scratch on the turnaround.
 */
const BPM = 88;
const SWING = 0.26;

const CHORDS = {
  Cm9: "C2 Eb3 G3 Bb3 D4",
  Abmaj7: "Ab1 C3 Eb3 G3",
  G7b9: "G1 F3 Ab3 B3 D4",
  Fm9: "F1 Ab3 C4 Eb4 G4",
  G7s9: "G1 F3 B3 D4 Bb4",
  Bb7sus: "Bb1 Ab3 C4 Eb4 F4",
  Gm7: "G1 F3 Bb3 D4",
  Dm7b5: "D2 F3 Ab3 C4",
  Ebmaj7: "Eb2 D3 G3 Bb3",
};

const BARS = bars(CHORDS, [
  ["Cm9", "G4 . G4 Bb4 . C5 . ."],
  ["Cm9", "Eb5 . D5 . C5 . Bb4 ."],
  ["Abmaj7", "C5 . . . G4 . . ."],
  ["G7b9", "Ab4 . G4 . F4 . D4 ."],
  ["Cm9", "G4 . G4 Bb4 . C5 . ."],
  ["Cm9", "Eb5 . F5 . G5 . Eb5 ."],
  ["Fm9", "F5 . . Eb5 . C5 . ."],
  ["G7s9", "D5 . . . B4 . . ."],
  ["Abmaj7", "Eb5 . . C5 . Eb5 . G5"],
  ["Bb7sus", "F5 . . . Eb5 . . ."],
  ["Gm7", "D5 . . Bb4 . D5 . F5"],
  ["Cm9", "Eb5 . . . . . . ."],
  ["Fm9", "Ab5 . . G5 . F5 . Eb5"],
  ["Dm7b5", "F5 . . . Ab4 . . ."],
  ["Ebmaj7", "G4 . Bb4 . Eb5 . G5 ."],
  ["G7s9", "F5 . . . D5 . B4 ."],
]);

/** The second horn takes the nearest chord tone at least a minor third under the lead. */
export function harmony(note: number, chord: readonly number[]): number {
  let best = note - 3;
  let gap = Infinity;
  for (const tone of chord.slice(1)) {
    for (let octave = -24; octave <= 24; octave += 12) {
      const candidate = tone + octave;
      const below = note - candidate;
      if (below >= 3 && below < gap) {
        gap = below;
        best = candidate;
      }
    }
  }
  return best;
}

/** Boom bap: a kick that skips before the third beat, a clipped snare on two and four. */
const KICK = new Set([0, 3, 10]);
const KICK_B = new Set([0, 7, 10, 11]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;
  const inB = index >= BARS.length / 2;
  const last = index === BARS.length - 1;
  const drums = grit(engine, out);

  if ((inB ? KICK_B : KICK).has(inBar) && !(last && inBar > 8)) kit.kick(engine, drums, time, inBar === 0 ? 0.3 : 0.24);
  if (inBar === 4 || inBar === 12) kit.snare(engine, drums, time, 0.16);
  if (inBar % 2 === 0) kit.hat(engine, drums, time, inBar % 4 === 2 ? 0.045 : 0.028);
  if (inBar === 7 || inBar === 15) kit.hat(engine, drums, time, 0.018);
  kit.crackle(engine, out, time);
  if (last && inBar === 8) scratch(engine, out, time, sixteenth * 3, 0.05);

  if (inBar === 0) sub(engine, out, root! + 12, time, sixteenth * 5, 0.19);
  if (inBar === 3 || inBar === 10) sub(engine, out, root! + 12, time, sixteenth * 2.5, 0.16);
  if (inBar === 14) sub(engine, out, root! + 22, time, sixteenth * 1.5, 0.16);

  // The dusty chop answers the hook on the and of two.
  if (inBar === 6 && !inB) stab(engine, out, voicing, time, 0.012);
  // The sample loop holds every bar; the Rhodes joins it in the B section.
  if (inBar === 0) loop(engine, out, voicing, time, sixteenth * 16, 0.009);
  if (inBar === 0 && inB) rhodes(engine, out, voicing, time, sixteenth * 10, 0.014);
  // The section punches in the B half: on the one and a push before three.
  if (inB && (inBar === 0 || inBar === 7)) {
    for (const note of voicing.slice(-3)) horn(engine, out, note + 12, time, sixteenth * 1.4, 0.016);
  }

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = Math.min(1.1, heldFor(bar.melody, inBar / 2) * sixteenth * 2);
  horn(engine, out, note, time, length, 0.036);
  if (!inB) horn(engine, out, harmony(note, bar.chord), time + 0.006, length, 0.022);
}

export const FIGHT_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
