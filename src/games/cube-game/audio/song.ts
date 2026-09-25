import type { BassStyle, LeadVoice } from "./instruments";
import { chord, line, note, type Step } from "./notes";

/** Layers a section of a song can switch on. */
export type Part = "kick" | "snare" | "clap" | "hat" | "open" | "bass" | "arp" | "pad" | "lead" | "leadB" | "half";

/** From this beat of the level on, these layers play. */
export interface Section {
  from: number;
  parts: ReadonlySet<Part>;
}

/**
 * A song, written as loops of sixteenths over a chord cycle, and an
 * arrangement keyed to the level's own beats: sparse for the intro,
 * full for the main part, a new lead where the mode changes.
 */
export interface Song {
  bpm: number;
  /** Swing on the off sixteenths, as a share of a sixteenth. */
  swing: number;
  /** One chord a bar, the bass root first, then the chord tones. */
  chords: number[][];
  lead: (Step | null)[];
  leadB: (Step | null)[];
  leadVoice: LeadVoice;
  leadBVoice: LeadVoice;
  /** Bass as semitones above the bar's root, held with "-". */
  bass: (Step | null)[];
  bassStyle: BassStyle;
  /** Chord tone numbers for the arpeggio, 1 the lowest, with "^" an octave up. */
  arp: (number | null)[];
  arpVoice: OscillatorType;
  drums: { kick: string; snare: string; hat: string };
  sections: Section[];
  /** Beats before the song loops back to its top. */
  length: number;
}

export interface SongText {
  bpm: number;
  swing?: number;
  chords: string[];
  lead: string;
  leadB: string;
  leadVoice: LeadVoice;
  leadBVoice?: LeadVoice;
  bass: string;
  bassStyle: BassStyle;
  arp: string;
  arpVoice?: OscillatorType;
  drums: { kick: string; snare: string; hat: string };
  sections: [number, string][];
  length: number;
}

/** Reads a song written as text. Bass lines are written as offsets, so they parse against C. */
export function song(text: SongText): Song {
  const root = note("C4");
  return {
    bpm: text.bpm,
    swing: text.swing ?? 0,
    chords: text.chords.map(chord),
    lead: line(text.lead),
    leadB: line(text.leadB),
    leadVoice: text.leadVoice,
    leadBVoice: text.leadBVoice ?? text.leadVoice,
    bass: line(
      text.bass
        .split(/\s+/)
        .map((t) => (/^-?\d+$/.test(t) ? midiName(root + Number(t)) : t))
        .join(" "),
    ).map((s) => (s ? { ...s, midi: s.midi - root } : null)),
    bassStyle: text.bassStyle,
    arp: text.arp.split(/\s+/).map((t) => (t === "." ? null : Number(t.replace("^", "")) + (t.endsWith("^") ? 100 : 0))),
    arpVoice: text.arpVoice ?? "triangle",
    drums: text.drums,
    sections: text.sections.map(([from, parts]) => ({ from, parts: new Set(parts.split(/\s+/).filter(Boolean) as Part[]) })),
    length: text.length,
  };
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** The section playing on a beat of the song. */
export function sectionAt(song: Song, beat: number): Section {
  let found = song.sections[0]!;
  for (const section of song.sections) {
    if (section.from > beat) break;
    found = section;
  }
  return found;
}
