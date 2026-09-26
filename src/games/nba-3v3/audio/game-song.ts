import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bell, boom, brass, drums, glow } from "./hype";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Full Court Press": under the game, bouncy arena hip hop in B minor at
 * 96. Sixteen bars: brass stabs shout the hook through the A section,
 * then in the B section a bell answers up high while the brass hits the
 * chords. A sliding 808, a tight kick, snare and clap on two and four,
 * and hats that roll into each turn. Its held sounds sit low and the hook
 * is short, so the organ and the stomp stomp clap sit on top.
 */
const BPM = 96;
const SWING = 0.08;

const CHORDS = {
  Bm: "B1 D4 F#4 B4",
  G: "G1 D4 G4 B4",
  Em: "E2 E4 G4 B4",
  "F#7": "F#1 E4 A#4 C#5",
  A: "A1 E4 A4 C#5",
  "F#m": "F#1 C#4 F#4 A4",
};

const BARS = bars(CHORDS, [
  ["Bm", "F#5 . F#5 . E5 D5 . B4"],
  ["G", ". . D5 . E5 . . ."],
  ["Em", "F#5 . F#5 . E5 D5 . B4"],
  ["F#7", ". . C#5 . A#4 . . ."],
  ["Bm", "F#5 . F#5 . E5 D5 . B4"],
  ["G", ". . D5 . E5 . G5 ."],
  ["Em", "F#5 . . E5 . D5 . ."],
  ["F#7", "C#5 . . . . . . ."],
  ["G", "B5 . . . D6 . . ."],
  ["A", "C#6 . . . A5 . . ."],
  ["F#m", "A5 . . . F#5 . . ."],
  ["Bm", "B5 . . . . . . ."],
  ["Em", "G5 . . B5 . . E6 ."],
  ["G", "D6 . . . B5 . . ."],
  ["A", "C#6 . . A5 . . E5 ."],
  ["F#7", "A#5 . . . C#6 . . ."],
]);

/** The bounce: the kick doubles up before the third beat and pushes into the next bar. */
const KICK = new Set([0, 3, 8, 10]);
/** The 808's register: low enough to boom, high enough for laptop speakers. */
function low(note: number): number {
  return 40 + ((((note - 40) % 12) + 12) % 12);
}

/** Where the 808 plays in a bar, and how many sixteenths it rings. */
const BOOM = new Map([[0, 5], [8, 2], [10, 4], [14, 2]]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;
  const inB = index >= BARS.length / 2;
  // Every fourth bar the hats roll in thirty second notes into the turn.
  const turn = index % 4 === 3;

  if (KICK.has(inBar)) drums.kick(engine, out, time, inBar === 0 ? 0.25 : 0.2);
  if (inBar === 4 || inBar === 12) drums.snare(engine, out, time, 0.1);
  if (inBar % 2 === 0 || inB) drums.hat(engine, out, time, inBar % 4 === 2 ? 0.03 : 0.018);
  if (turn && inBar >= 12) drums.hat(engine, out, time + sixteenth / 2, 0.016);

  const ring = BOOM.get(inBar);
  if (ring) {
    // The last hit of the bar slides into the next root, the 808's signature.
    const next = BARS[(index + 1) % BARS.length]!.chord[0]!;
    if (inBar === 14) boom(engine, out, low(next), time, sixteenth * ring, 0.085, low(root!));
    else boom(engine, out, low(root!), time, sixteenth * ring, inBar === 0 ? 0.1 : 0.085);
  }

  if (inBar === 0) glow(engine, out, voicing.slice(0, 3).map((n) => n - 12), time, sixteenth * 16, 0.012);
  if (inB && (inBar === 0 || inBar === 6)) brass(engine, out, voicing.slice(-3), time, sixteenth * (inBar === 0 ? 2 : 1.2), 0.012);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  if (inB) {
    bell(engine, out, note, time, 0.05);
    return;
  }
  const length = Math.min(0.4, heldFor(bar.melody, inBar / 2) * sixteenth * 2 * 0.7);
  brass(engine, out, [note, note - 12], time, length, 0.02);
}

export const GAME_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
