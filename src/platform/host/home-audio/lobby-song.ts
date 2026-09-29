/**
 * The home screen tune as plain data: a warm, bouncy eight bar loop in F
 * major at 96 BPM. Soft keys and a round bass carry a I iii IV V turn,
 * a light kick, snap and shaker keep it moving, and a bell melody sings a
 * hook that answers itself in the second half. Kept free of Web Audio so
 * the arrangement can be tested on its own.
 */
export const LOBBY_BPM = 96;
export const BAR_STEPS = 16;

export type Voice = "kick" | "snap" | "shaker" | "bass" | "keys" | "stab" | "bell";

export interface SongEvent {
  voice: Voice;
  /** MIDI notes. Empty for drums. */
  notes: number[];
  /** Length in sixteenth steps. */
  steps: number;
  /** A touch louder, for the beats that lead. */
  accent?: boolean;
}

interface Bar {
  bass: number;
  chord: number[];
  /** [step, MIDI note, length in steps] */
  melody: [number, number, number][];
}

/** Fmaj9, Am7, Bbmaj7, C7sus, then Dm9, Bbmaj7, Gm7, C9sus back to the top. */
const BARS: Bar[] = [
  { bass: 41, chord: [57, 60, 64, 67], melody: [[0, 72, 3], [3, 69, 1], [4, 72, 2], [6, 74, 2], [8, 72, 4], [12, 69, 2], [14, 67, 2]] },
  { bass: 45, chord: [57, 60, 64, 67], melody: [[0, 69, 6], [6, 67, 2], [8, 64, 4], [12, 67, 2], [14, 69, 2]] },
  { bass: 46, chord: [58, 62, 65, 69], melody: [[0, 74, 3], [3, 72, 1], [4, 74, 2], [6, 77, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2]] },
  { bass: 36, chord: [58, 60, 65, 67], melody: [[0, 72, 8], [10, 70, 2], [12, 69, 2], [14, 67, 2]] },
  { bass: 38, chord: [57, 60, 64, 65], melody: [[0, 69, 3], [3, 65, 1], [4, 69, 2], [6, 72, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2]] },
  { bass: 46, chord: [58, 62, 65, 69], melody: [[0, 74, 6], [6, 72, 2], [8, 69, 4], [12, 72, 2], [14, 74, 2]] },
  { bass: 43, chord: [55, 58, 62, 65], melody: [[0, 77, 3], [3, 76, 1], [4, 74, 2], [6, 72, 2], [8, 74, 4], [12, 70, 2], [14, 69, 2]] },
  { bass: 36, chord: [58, 62, 65, 67], melody: [[0, 67, 8], [12, 69, 2], [14, 70, 2]] },
];

export const STEPS_PER_LOOP = BARS.length * BAR_STEPS;

/** The bass bounces: root, a ghost, the octave, root, a fifth, root, octave. [step, interval, length] */
const BASS_LINE: [number, number, number][] = [[0, 0, 3], [3, 0, 1], [6, 12, 2], [8, 0, 3], [11, 7, 1], [12, 0, 2], [14, 12, 2]];
/** Short chord stabs on the off beats, between the held chord at the top of each bar. */
const STAB_STEPS = [6, 10, 14];
const KICK_STEPS = [0, 8, 10];
const SNAP_STEPS = [4, 12];

/** Everything that starts on one sixteenth of the loop. */
export function eventsAt(step: number): SongEvent[] {
  const inLoop = ((step % STEPS_PER_LOOP) + STEPS_PER_LOOP) % STEPS_PER_LOOP;
  const bar = BARS[Math.floor(inLoop / BAR_STEPS)]!;
  const at = inLoop % BAR_STEPS;
  const events: SongEvent[] = [];

  if (KICK_STEPS.includes(at)) events.push({ voice: "kick", notes: [], steps: 2, accent: at === 0 });
  if (SNAP_STEPS.includes(at)) events.push({ voice: "snap", notes: [], steps: 1 });
  // Eighths, leaning on the off beat, which is what makes it swing along.
  if (at % 2 === 0) events.push({ voice: "shaker", notes: [], steps: 1, accent: at % 4 === 2 });

  for (const [start, interval, steps] of BASS_LINE) {
    if (start === at) events.push({ voice: "bass", notes: [bar.bass + interval], steps, accent: start === 0 });
  }
  if (at === 0) events.push({ voice: "keys", notes: bar.chord, steps: 6 });
  if (STAB_STEPS.includes(at)) events.push({ voice: "stab", notes: bar.chord, steps: 2 });
  for (const [start, note, steps] of bar.melody) {
    if (start === at) events.push({ voice: "bell", notes: [note], steps });
  }
  return events;
}
