/**
 * Tunes are written as text, one bar a row: a chord name and eight
 * eighth notes like "C5 . F5 A5", with "." for a rest. That keeps a
 * melody readable at a glance instead of a wall of numbers.
 */

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI number of a note name, like 60 for "C4" or 70 for "Bb4". */
export function note(name: string): number {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!match) throw new Error(`not a note: ${name}`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return 12 * (Number(octave) + 1) + LETTERS[letter!]! + shift;
}

export interface Bar {
  /** Bass root first, then the chord tones. */
  chord: readonly number[];
  /** Eight eighth notes, null for a rest. */
  melody: readonly (number | null)[];
}

/** Reads rows of [chord name, melody] against a table of chords. */
export function bars(chords: Record<string, string>, rows: readonly (readonly [string, string])[]): Bar[] {
  return rows.map(([name, melody]) => {
    const chord = chords[name];
    if (!chord) throw new Error(`no chord: ${name}`);
    const steps = melody.trim().split(/\s+/).map((token) => (token === "." ? null : note(token)));
    if (steps.length !== 8) throw new Error(`bar needs eight steps: ${melody}`);
    return { chord: chord.split(/\s+/).map(note), melody: steps };
  });
}

/** How long the note on a step rings: up to the next note, in steps. */
export function heldFor(melody: readonly (number | null)[], step: number): number {
  let length = 1;
  while (step + length < melody.length && melody[step + length] === null) length++;
  return length;
}
