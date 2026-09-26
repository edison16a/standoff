/** One note of a melody: its pitch as a MIDI note and its length in sixteenths. */
export interface Note {
  note: number;
  length: number;
}

/** Reads [step, note, length] rows into a lookup by step, which reads far easier than a wall of slots. */
export function phrase(rows: readonly (readonly [number, number, number])[]): Map<number, Note> {
  return new Map(rows.map(([step, note, length]) => [step, { note, length }]));
}
