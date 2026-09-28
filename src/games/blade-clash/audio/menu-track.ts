import { choir, drone, frameDrum, koto, shaker, shakuhachi, strings } from "./instruments";
import { chords, melody } from "./score";
import type { Track } from "./tracks";

/*
 * Lobby, "Still Water": G major at 72. Strings and a low drone hold the
 * chords without a gap, a bamboo flute carries the tune, and a koto and
 * a frame drum keep an easy pulse. The A half sits low and settles; the
 * B half climbs, with a soft choir under it.
 */

const BPM = 72;
const CHORDS = chords([
  "G2 B3 D4 G4", "E2 B3 D4 G4", "C2 G3 D4 E4", "D2 A3 D4 F#4",
  "G2 B3 D4 G4", "B1 A3 D4 F#4", "C2 G3 D4 E4", "D2 G3 A3 D4",
  "E2 B3 D4 G4", "C2 G3 C4 E4", "G2 B3 D4 G4", "D2 A3 D4 F#4",
  "E2 B3 D4 G4", "C2 G3 C4 E4", "A1 G3 C4 E4", "D2 A3 C4 F#4",
]);
export const STILL_WATER = melody(`
  D5:6 E5:2 G5:8 | A5:4 G5:4 E5:8 | D5:6 E5:2 G5:4 E5:4 | D5:12 -:4
  B4:4 D5:4 G5:6 A5:2 | B5:8 A5:4 F#5:4 | G5:4 E5:4 D5:4 E5:4 | A4:12 -:4
  G5:4 B5:4 D6:8 | C6:6 B5:2 G5:8 | B5:6 A5:2 G5:4 D5:4 | E5:4 F#5:4 A5:8
  B5:8 A5:4 G5:4 | E5:6 G5:2 A5:8 | G5:4 E5:4 D5:4 C5:4 | D5:8 -:8
`);
/** The koto's figure: which chord tone it plucks on which sixteenth, rising then falling back. */
const KOTO: Record<number, number> = { 8: 0, 10: 1, 11: 2, 14: 1 };

export const MENU_TRACK: Track = {
  bpm: BPM,
  level: 0.8,
  length: 16 * CHORDS.length,
  play(engine, out, step, at) {
    const bar = Math.floor(step / 16) % CHORDS.length;
    const inBar = step % 16;
    const [root, ...tones] = CHORDS[bar]!;
    const beat = 60 / BPM;
    const lift = bar >= CHORDS.length / 2;

    if (inBar === 0) {
      strings(engine, out, at, tones, beat * 4, lift ? 0.009 : 0.008);
      drone(engine, out, at, root!, beat * 3.6, 0.08);
      if (lift && bar % 4 === 0) choir(engine, out, at, [tones[0]!, tones[2]!], beat * 8, 0.006);
    }
    if (inBar === 0) frameDrum(engine, out, at, 0.2);
    if (inBar === 10) frameDrum(engine, out, at, 0.1);
    if (inBar === 6 || inBar === 14) frameDrum(engine, out, at, 0.04, true);
    if (inBar % 4 === 2) shaker(engine, out, at, 0.014);

    // The koto answers the flute every other bar, an octave up, then falls quiet.
    const pluck = KOTO[inBar];
    if (bar % 2 === 1 && pluck !== undefined) koto(engine, out, at, tones[pluck]! + 12, 0.03);

    const note = STILL_WATER[step % STILL_WATER.length];
    if (note) shakuhachi(engine, out, at, note.midi, note.steps * (beat / 4) * 0.95, 0.055);
  },
};
