import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bass, chop, hat, keys, kick, rim, snare, vibes, whistle } from "./band";
import { locate, type Groove, type Tune } from "./tunes";

/**
 * Plays whatever falls on one sixteenth of a tune. The groove sets how
 * much of the kit plays, and the last bar of the form gets a little
 * snare fill so the loop turns round without a seam.
 */

const KICKS: Record<Groove, ReadonlySet<number>> = {
  full: new Set([0, 7, 10]),
  half: new Set([0, 10]),
  light: new Set([0, 9]),
};

function drums(engine: AudioEngine, out: AudioNode, groove: Groove, inBar: number, at: number, fill: boolean): void {
  if (KICKS[groove].has(inBar) && !(fill && inBar > 8)) kick(engine, out, at, groove === "light" ? 0.28 : 0.34);
  if (inBar === 4 || inBar === 12) {
    if (groove === "light") rim(engine, out, at, 0.05);
    else snare(engine, out, at, groove === "half" ? 0.09 : 0.11);
  }
  if (fill && (inBar === 13 || inBar === 14 || inBar === 15)) snare(engine, out, at, 0.035 + 0.015 * (inBar - 13));
  // Ghost notes on the snare give the full groove its shuffle.
  if (groove === "full" && (inBar === 7 || inBar === 15) && !fill) snare(engine, out, at, 0.025);
  const hatEvery = groove === "light" ? 4 : 2;
  if (inBar % hatEvery === 0 || (groove === "full" && inBar % 2 === 1 && inBar % 4 === 3)) {
    hat(engine, out, at, groove !== "light" && inBar === 14, inBar % 4 === 2 ? 0.04 : 0.025);
  }
}

export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number, sixteenth: number): void {
  const { section, local, last } = locate(tune, step);
  const bar = Math.floor(local / 16);
  const inBar = local % 16;
  const chord = section.chords[bar]!;
  const voicing = chord.slice(1);
  const fill = last && bar === section.chords.length - 1;
  drums(engine, out, section.groove, inBar, at, fill);

  const offset = section.bass[inBar];
  if (offset !== null && offset !== undefined) {
    // The note before a rest rings on, the rest are clipped for bounce.
    const ringing = section.bass[inBar + 1] === null && section.bass[inBar + 2] === null;
    bass(engine, out, at, chord[0]! + offset, sixteenth * (ringing ? 3 : 1.6), 0.2, offset === 12);
  }

  // Piano on the one and a push on the and of two; the half groove holds the chord longer.
  if (inBar === 0) keys(engine, out, at, voicing, sixteenth * (section.groove === "full" ? 5 : 12), 0.02);
  if (inBar === 6 && section.groove !== "light") keys(engine, out, at, voicing, sixteenth * 3, 0.014);
  if (inBar === 11 && section.groove === "light") keys(engine, out, at, voicing, sixteenth * 6, 0.016);

  if (section.chops && (inBar === 2 || inBar === 10 || inBar === 14)) chop(engine, out, at, voicing.slice(1), 0.011);

  const note = section.lead[local];
  if (note !== null && note !== undefined) {
    // A note rings until the next one, up to a beat and a half.
    let length = 1;
    while (length < 6 && section.lead[local + length] === null) length++;
    const play = section.leadVoice === "whistle" ? whistle : vibes;
    play(engine, out, at, note, sixteenth * (length + 1), section.leadVoice === "whistle" ? 0.06 : 0.05);
  }
}
