/** One note of a melody: its pitch as a MIDI note and its length in sixteenths. */
export interface Note {
  note: number;
  length: number;
}

/** Reads [step, note, length] rows into a lookup by step, which reads far easier than a wall of slots. */
export function phrase(rows: readonly (readonly [number, number, number])[]): Map<number, Note> {
  return new Map(rows.map(([step, note, length]) => [step, { note, length }]));
}

const F_MAJOR = [0, 2, 4, 5, 7, 9, 11].map((n) => (n + 5) % 12);

/** The note a third below in F major, so the marimba can play in two mallet harmony. */
export function thirdBelowInF(note: number): number {
  for (let down = 3; down <= 4; down++) if (F_MAJOR.includes((note - down + 120) % 12)) return note - down;
  return note - 3;
}
