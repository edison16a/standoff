import { mutedTrumpet, organ, upright } from "./band";
import { kit } from "./kit";
import { bars } from "./score";
import { track } from "./track";

/**
 * "Boardwalk Dusk", the lobby tune: a slow swung stroll in G major at 80,
 * the fair winding down for the night. A soft band organ holds every
 * chord and swells into the next, so it never stops flowing. A muted
 * trumpet sings the melody (A), the organ's mellow stops answer it over
 * new chords (B), over an upright bass and brushes. Sixteen bars.
 */

const CHORDS = {
  Gmaj7: "G2 F#3 B3 D4",
  Em7: "E2 G3 B3 D4",
  Am7: "A2 G3 C4 E4",
  D9: "D3 F#3 C4 E4",
  Bm7: "B2 F#3 A3 D4",
  E7: "E2 G#3 B3 D4",
  D7sus: "D3 G3 C4 E4",
  Cmaj7: "C3 E3 G3 B3",
  Cm6: "C3 Eb3 G3 A3",
  D7: "D3 F#3 A3 C4",
};

export const BOARDWALK = track({
  bpm: 80,
  swing: 0.25,
  bars: bars(CHORDS, [
    ["Gmaj7", "B4 . D5 . F#5 . . ."],
    ["Em7", "G5 . . . E5 . . ."],
    ["Am7", "C5 . E5 . G5 . . ."],
    ["D9", "F#5 . . . E5 . . ."],
    ["Bm7", "D5 . F#5 . A5 . . ."],
    ["E7", "G#5 . . . E5 . . ."],
    ["Am7", "A5 . G5 . E5 . C5 ."],
    ["D7sus", "D5 . . . . . . ."],
    ["Cmaj7", "E5 . . . G5 . B5 ."],
    ["Cm6", "A5 . . . Eb5 . . ."],
    ["Bm7", "D5 . . . F#5 . A5 ."],
    ["E7", "G#5 . . . E5 . D5 ."],
    ["Am7", "C5 . . . E5 . A5 ."],
    ["D7", "F#5 . . . . . C5 ."],
    ["Gmaj7", "B4 . D5 . G5 . F#5 ."],
    ["D7", "A5 . . . . . . ."],
  ]),
  groove(engine, out, bar, next, _index, inBar, at, eighth) {
    const root = bar.chord[0]!;
    if (inBar === 0) organ(engine, out, at, bar.chord.slice(1), eighth * 8, 0.06, true);
    if (inBar === 0) upright(engine, out, at, root, eighth * 3.5, 0.18);
    if (inBar === 4) upright(engine, out, at, root + 7, eighth * 2.5, 0.14);
    // A chromatic step into the next bar's root, the walking bass's little lean.
    if (inBar === 7) upright(engine, out, at, next.chord[0]! - 1, eighth, 0.08);
    if (inBar === 0) kit.kick(engine, out, at, 0.12);
    if (inBar === 2 || inBar === 6) kit.brush(engine, out, at, 0.035);
    if (inBar % 2 === 1) kit.shaker(engine, out, at, 0.012);
  },
  melody(engine, out, note, at, length, section) {
    if (section === "A") mutedTrumpet(engine, out, at, note, Math.min(length, 2.2) * 0.9, 0.06);
    else organ(engine, out, at, [note], Math.min(length, 2.2), 0.05, true);
  },
});
