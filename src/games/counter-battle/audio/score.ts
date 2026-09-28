/**
 * Melodies and chords written as text, so a tune reads like a lead sheet
 * instead of a wall of numbers. A melody token is a note name and how
 * many sixteenths it holds, like "E5:4", or "-:2" for a rest. A bar line
 * "|" is only there for the reader.
 */

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** One note of a melody: its pitch and how many sixteenths it holds. */
export interface Note {
  midi: number;
  steps: number;
}

/** MIDI number of a note name, like 60 for "C4" or 70 for "A#4". */
export function pitch(name: string): number {
  const match = /^([A-G])(#?)(\d)$/.exec(name);
  if (!match) throw new Error(`not a note: ${name}`);
  return 12 * (Number(match[3]) + 1) + LETTERS[match[1]!]! + (match[2] ? 1 : 0);
}

/** One entry per sixteenth: a note where one starts, null elsewhere. */
export function melody(text: string): (Note | null)[] {
  const steps: (Note | null)[] = [];
  for (const token of text.trim().split(/\s+/)) {
    if (token === "|") continue;
    const [name, count] = token.split(":");
    const length = Number(count ?? 1);
    if (!Number.isInteger(length) || length < 1) throw new Error(`bad length: ${token}`);
    steps.push(name === "-" ? null : { midi: pitch(name!), steps: length });
    for (let i = 1; i < length; i++) steps.push(null);
  }
  return steps;
}

/** Chords as note names, the bass root first, one string a bar. */
export function chords(bars: string[]): number[][] {
  return bars.map((bar) => bar.trim().split(/\s+/).map(pitch));
}
