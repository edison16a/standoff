/**
 * Songs are written as text: note names like "C4" or "F#3", one token per
 * sixteenth, with "." for a rest and "-" to hold the note before. That
 * keeps a melody readable on one line instead of a wall of numbers.
 */

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI number of a note name, like 60 for "C4". */
export function note(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`not a note: ${name}`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return 12 * (Number(octave) + 1) + LETTERS[letter!]! + shift;
}

/** One sixteenth of a line: a note starting and how many sixteenths it lasts, or nothing. */
export interface Step {
  midi: number;
  length: number;
}

/** Reads a line of tokens into steps. Held notes grow the length of the note they follow. */
export function line(text: string): (Step | null)[] {
  const tokens = text.trim().split(/\s+/);
  const steps: (Step | null)[] = [];
  let last: Step | null = null;
  for (const token of tokens) {
    if (token === "-" && last) {
      last.length += 1;
      steps.push(null);
    } else if (token === "." || token === "-") {
      last = null;
      steps.push(null);
    } else {
      last = { midi: note(token), length: 1 };
      steps.push(last);
    }
  }
  return steps;
}

/** A chord from note names, lowest first. */
export function chord(text: string): number[] {
  return text.trim().split(/\s+/).map(note);
}

/** Frequency in hertz of a MIDI note. */
export function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
