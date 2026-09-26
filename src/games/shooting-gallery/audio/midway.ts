import { brass, calliope, organ, tuba } from "./band";
import { kit } from "./kit";
import { bars } from "./score";
import { track } from "./track";

/**
 * "Midway Swing", the round's song: a fairground swing in E flat major
 * at 128. The calliope plays the hook over an oom pah of tuba and organ
 * (A), then the brass section takes the tune over new chords while the
 * organ keeps the pah (B). A snare roll in the last bar leads back to
 * the top. Sixteen bars of swung eighths.
 */

const CHORDS = {
  Eb: "Eb2 G3 Bb3 Eb4",
  Bb7: "Bb1 Ab3 D4 F4",
  Ab: "Ab2 Ab3 C4 Eb4",
  Cm: "C3 G3 C4 Eb4",
  Gm: "G2 G3 Bb3 D4",
  F7: "F2 A3 C4 Eb4",
  Bb: "Bb1 F3 Bb3 D4",
};

export const MIDWAY = track({
  bpm: 128,
  swing: 0.3,
  bars: bars(CHORDS, [
    ["Eb", "G4 . Bb4 Eb5 . D5 Eb5 ."],
    ["Eb", "G5 . F5 . Eb5 . Bb4 ."],
    ["Bb7", "Ab4 . C5 F5 . E5 F5 ."],
    ["Eb", "G5 . . . Eb5 . . ."],
    ["Ab", "C5 . Eb5 Ab5 . G5 Ab5 ."],
    ["Eb", "Bb5 . G5 . Eb5 . G5 ."],
    ["Bb7", "Ab5 . G5 F5 . D5 . Bb4"],
    ["Eb", "Eb5 . . . . . Bb4 ."],
    ["Cm", "Eb5 . . . G5 . . ."],
    ["Gm", "D5 . . . Bb4 . D5 ."],
    ["Ab", "C5 . . . Eb5 . Ab5 ."],
    ["Eb", "G5 . . . . . Eb5 ."],
    ["F7", "A4 . C5 . Eb5 . F5 ."],
    ["Bb", "D5 . . . F5 . Bb5 ."],
    ["Ab", "C6 . Bb5 . Ab5 . F5 ."],
    ["Bb7", "D5 . F5 . Ab5 . Bb5 ."],
  ]),
  groove(engine, out, bar, _next, index, inBar, at, eighth) {
    const root = bar.chord[0]!;
    const tones = bar.chord.slice(1);
    // Oom on the beat, pah on the off beat: the fairground's walk.
    if (inBar === 0) tuba(engine, out, at, root, eighth * 1.4, 0.17);
    if (inBar === 4) tuba(engine, out, at, root + 7, eighth * 1.4, 0.15);
    // The last off beat of the loop pushes into the top, so the seam swings instead of stopping.
    if (inBar === 2 || inBar === 6 || (index === 15 && inBar === 7)) organ(engine, out, at, tones, eighth * 0.9, 0.05);
    if (index < 8 && index % 2 === 1 && inBar === 7) brass(engine, out, at, tones, eighth * 0.8, 0.05);
    if (inBar === 0 || inBar === 4) kit.kick(engine, out, at, 0.2);
    if (inBar === 2 || inBar === 6) kit.snare(engine, out, at, 0.04);
    if (index === 15 && inBar >= 4) kit.snare(engine, out, at, 0.03 + (inBar - 4) * 0.015);
    kit.ride(engine, out, at, inBar % 2 === 1 ? 0.018 : 0.012);
  },
  melody(engine, out, note, at, length, section) {
    if (section === "A") calliope(engine, out, at, note, Math.min(length, 0.8), 0.06);
    else brass(engine, out, at, [note, note - 12], Math.min(length, 1.2) * 0.9, 0.065);
  },
});
