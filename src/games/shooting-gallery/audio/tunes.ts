import type { AudioEngine } from "@/platform/audio/audio-engine";
import { human, kit, musicBox, organ, strum, upright, whistle } from "./band";
import { bars, heldFor, type Bar } from "./score";

/**
 * Two boardwalk tunes for the booth, each sixteen bars: an A section
 * with the hook and a B section that answers it on another voice. The
 * lobby's is a slow swung stroll on a music box; the round's is a
 * bouncier whistled two step in another key. A track is told "step n
 * starts at time t" and books whatever plays there.
 */
export interface Track {
  /** Seconds per step (an eighth note). */
  step: number;
  length: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

interface Arrangement {
  bpm: number;
  /** How late the off eighths land, as a share of an eighth. */
  swing: number;
  bars: Bar[];
  /** Plays the rhythm section for one step of a bar. */
  groove(engine: AudioEngine, out: AudioNode, bar: Bar, next: Bar, inBar: number, at: number, eighth: number): void;
  /** Plays the tune for one step, told which section it is in. */
  melody(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, section: "A" | "B"): void;
}

function track(a: Arrangement): Track {
  const eighth = 60 / a.bpm / 2;
  return {
    step: eighth,
    length: a.bars.length * 8,
    play(engine, out, step, at) {
      const index = Math.floor(step / 8);
      const bar = a.bars[index]!;
      const next = a.bars[(index + 1) % a.bars.length]!;
      const inBar = step % 8;
      const time = at + (inBar % 2 === 1 ? a.swing * eighth : 0);
      a.groove(engine, out, bar, next, inBar, time, eighth);
      const note = bar.melody[inBar];
      if (note === null || note === undefined) return;
      const section = index < a.bars.length / 2 ? "A" : "B";
      a.melody(engine, out, note, time, heldFor(bar.melody, inBar) * eighth, section);
    },
  };
}

const LOBBY_CHORDS = {
  F: "F2 A3 C4 F4",
  Dm7: "D3 A3 C4 F4",
  Gm7: "G2 Bb3 D4 F4",
  C7: "C3 Bb3 E4 G4",
  Bbmaj7: "Bb2 A3 D4 F4",
  Bbm6: "Bb2 G3 Db4 F4",
  Am7: "A2 G3 C4 E4",
  D7: "D3 A3 C4 F#4",
};

/** The lobby: a lazy swung stroll in F, hook on the music box, the answer whistled over a reed organ. */
export const STROLL = track({
  bpm: 92,
  swing: 0.33,
  bars: bars(LOBBY_CHORDS, [
    ["F", "C5 . F5 A5 . G5 . F5"],
    ["Dm7", "A5 . . . F5 . D5 ."],
    ["Gm7", "Bb4 . D5 F5 . E5 . D5"],
    ["C7", "E5 . . . C5 . . ."],
    ["F", "C5 . F5 A5 . G5 . F5"],
    ["Dm7", "C6 . . . A5 . F5 ."],
    ["C7", "G5 . F5 . D5 . E5 ."],
    ["F", "F5 . . . . . . ."],
    ["Bbmaj7", "D5 . F5 . A5 . . G5"],
    ["Bbm6", "F5 . Db5 . . . C5 ."],
    ["Am7", "C5 . E5 G5 . . E5 ."],
    ["D7", "F#5 . . . A5 . C6 ."],
    ["Gm7", "Bb5 . A5 G5 . F5 . D5"],
    ["C7", "E5 . G5 . Bb5 . . ."],
    ["F", "A5 . . . F5 . C5 ."],
    ["C7", "E5 . G5 . C6 . . ."],
  ]),
  groove(engine, out, bar, next, inBar, at, eighth) {
    const root = bar.chord[0]!;
    if (inBar === 0) upright(engine, out, root, at, eighth * 3.5);
    if (inBar === 4) upright(engine, out, root + 7, at, eighth * 2.5, 0.17);
    // A chromatic step into the next bar's root, the walking bass's little lean.
    if (inBar === 7) upright(engine, out, next.chord[0]! - 1, at, eighth, 0.1);
    if (inBar === 0) kit.kick(engine, out, at, 0.22);
    if (inBar === 2 || inBar === 6) {
      kit.brush(engine, out, at, 0.05);
      strum(engine, out, bar.chord.slice(1), at, 0.02);
    }
    if (inBar % 2 === 1) kit.shaker(engine, out, at, 0.018);
    if (inBar === 0) organ(engine, out, bar.chord.slice(1), at, eighth * 8, 0.006);
  },
  melody(engine, out, note, at, length, section) {
    if (section === "A") musicBox(engine, out, note, at, 0.06);
    else whistle(engine, out, note, at, Math.min(length, 0.9), 0.045);
  },
});

const ROUND_CHORDS = {
  G: "G2 B3 D4 G4",
  Em: "E3 B3 E4 G4",
  C: "C3 C4 E4 G4",
  D: "D3 A3 D4 F#4",
  D7: "D3 A3 C4 F#4",
  Cm: "C3 C4 Eb4 G4",
  E7: "E3 B3 D4 G#4",
  Am: "A2 A3 C4 E4",
};

/** The round: a bouncy whistled two step in G, the B section on the music box with a minor turn. */
export const TWO_STEP = track({
  bpm: 112,
  swing: 0.22,
  bars: bars(ROUND_CHORDS, [
    ["G", "B4 D5 G5 . F#5 G5 A5 ."],
    ["Em", "G5 . . . E5 . . ."],
    ["C", "C5 E5 G5 . F#5 G5 A5 ."],
    ["D", "F#5 . . . D5 . . ."],
    ["G", "B4 D5 G5 . F#5 G5 A5 ."],
    ["Em", "B5 . . . G5 . E5 ."],
    ["D7", "C6 . B5 . A5 . F#5 ."],
    ["G", "G5 . . . . . D5 ."],
    ["C", "E5 . G5 . E5 . C5 ."],
    ["Cm", "Eb5 . G5 . Eb5 . C5 ."],
    ["G", "D5 . G5 . B5 . . A5"],
    ["E7", "G#5 . . . B5 . D6 ."],
    ["Am", "C6 . B5 A5 . G5 . E5"],
    ["D7", "F#5 . A5 . C6 . . ."],
    ["G", "B5 . . . G5 . D5 ."],
    ["D7", "F#5 . A5 . D5 . . ."],
  ]),
  groove(engine, out, bar, _next, inBar, at, eighth) {
    const root = bar.chord[0]!;
    if (inBar === 0) upright(engine, out, root, at, eighth * 1.8);
    if (inBar === 3) upright(engine, out, root + 12, at, eighth * 0.8, 0.09);
    if (inBar === 4) upright(engine, out, root + 7, at, eighth * 1.8, 0.17);
    if (inBar === 0 || inBar === 4) kit.kick(engine, out, at, 0.26);
    if (inBar === 2 || inBar === 6) kit.rim(engine, out, at, 0.05);
    // The off beat strum is what makes it bounce.
    if (inBar % 2 === 1) strum(engine, out, bar.chord.slice(1), at, 0.016 * human());
    kit.shaker(engine, out, at, inBar % 2 === 1 ? 0.022 : 0.012);
  },
  melody(engine, out, note, at, length, section) {
    if (section === "A") whistle(engine, out, note, at, Math.min(length, 0.7), 0.05);
    else musicBox(engine, out, note, at, 0.055);
  },
});

/** A short flourish for the winner: a whistle run up into a rung music box chord over the bass. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [67, 71, 74, 79].forEach((note, i) => whistle(engine, out, note + 12, at + i * 0.11, 0.14, 0.06));
  const held = at + 0.5;
  for (const note of [79, 83, 86, 91]) musicBox(engine, out, note, held, 0.05);
  whistle(engine, out, 91, held, 1.1, 0.055);
  strum(engine, out, [67, 71, 74, 79], held, 0.04);
  upright(engine, out, 43, held, 1.2, 0.22);
  kit.kick(engine, out, held, 0.3);
}
