import { song, type Song } from "./song";

/**
 * One song per level plus the menu's. Each is four bars of chords with a
 * hook on top, arranged on the level's own beats: the lead changes where
 * the mode changes, and the drums drop out to float through the UFO.
 */

const FOUR = { kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x." };
const LAZY = { kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." };

const FULL = "kick snare hat bass arp pad lead";

export const SONGS: Record<string, Song> = {
  menu: song({
    bpm: 88,
    swing: 0.22,
    chords: ["D2 F#3 A3 C#4", "B1 A3 D4 F#4", "G1 F#3 B3 D4", "A1 E3 G3 C#4"],
    lead: ". . F#5 . A5 . . . C#6 - - . B5 . A5 . F#5 - - - - - . . . . D5 . E5 . F#5 . . . D5 . F#5 . . . B5 - - . A5 . F#5 . E5 - - - - - . . . . . . . . . .",
    leadB: "A5 - - . F#5 . A5 . B5 - - . A5 . F#5 . D6 - - - - - . . C#6 . B5 . A5 . . . G5 - - . B5 . D6 . F#5 - - . E5 . D5 . E5 - - - C#5 - - - A4 - - - . . . .",
    leadVoice: "bell",
    leadBVoice: "glass",
    bass: "0 - - . . . . . 7 - . . 0 . . .",
    bassStyle: "round",
    arp: "1 . . 2 . . 3 . . 4 . . 3 . . .",
    drums: LAZY,
    // A, then the glass answer, A again with open hats, then the answer with the kick out to breathe.
    sections: [[0, "kick clap hat bass arp pad lead"], [16, "kick clap hat bass arp pad leadB"], [32, "kick clap hat open bass arp pad lead"], [48, "clap hat bass arp pad leadB"]],
    length: 64,
  }),

  "first-light": song({
    bpm: 110,
    swing: 0.12,
    chords: ["F2 A3 C4 E4", "G2 B3 D4 E4", "E2 G3 B3 D4", "A2 G3 C4 E4"],
    lead: "E5 . G5 . A5 - - . G5 . E5 . D5 . C5 . D5 - - . E5 . G5 - - - . . B4 . C5 . E5 . G5 . B5 - - . A5 . G5 . E5 . D5 . E5 - - - - - - . . . C5 . D5 . E5 .",
    leadB: "A5 - - . G5 - - . E5 - - . G5 - - . B5 - - . A5 - - . G5 - - - - - . . G5 - - . E5 - - . D5 - - . E5 - - . C5 - - - - - - - . . . . . . . .",
    leadVoice: "bell",
    leadBVoice: "glass",
    bass: "0 - - . . . 0 . 7 - . . 0 . . .",
    bassStyle: "round",
    arp: "1 . 2 . 3 . 4 . 3 . 2 . 3 . 4 .",
    drums: LAZY,
    sections: [[0, "pad arp hat"], [8, "kick clap hat bass arp pad"], [16, `kick clap hat bass arp pad lead`], [46, "pad arp leadB hat bass"], [60, "kick clap hat open bass arp pad lead"], [84, "pad arp"]],
    length: 88,
  }),

  "sunset-bounce": song({
    bpm: 116,
    chords: ["D2 F3 A3 C4 E4", "G2 F3 A3 B3 E4", "C2 E3 G3 B3 D4", "A2 G3 C#4 E4"],
    lead: "A4 . C5 . D5 . . C5 D5 . F5 . E5 . D5 . E5 - - . D5 . B4 . A4 - - - . . . . G4 . B4 . D5 . . B4 D5 . G5 . E5 . D5 . C#5 - - . E5 - - . A5 - - - G5 . E5 .",
    leadB: "D5 . D5 . F5 . D5 . A5 . G5 . F5 . E5 . D5 . . . B4 . . . G4 . A4 . B4 . D5 . E5 . E5 . G5 . E5 . B5 . A5 . G5 . E5 . C#5 . . . E5 . . . A4 - - - . . . .",
    leadVoice: "saw",
    leadBVoice: "square",
    bass: "0 . 0 12 . 0 . 7 0 . 0 12 . 10 . 7",
    bassStyle: "pluck",
    arp: "1 3 2 4 1 3 2 4 1 3 2 4 1 3 2 4",
    arpVoice: "square",
    drums: FOUR,
    sections: [[0, "pad hat bass"], [8, "kick snare hat bass pad arp"], [16, FULL], [34, "kick snare hat open bass arp pad leadB"], [48, FULL], [80, "kick snare hat open bass arp pad leadB"], [91, FULL], [106, "pad arp"]],
    length: 110,
  }),

  "cloud-hopper": song({
    bpm: 122,
    chords: ["D#2 G3 A#3 D4", "C2 D#3 G3 A#3", "G#1 C4 D#4 G4", "A#1 D4 F4 G#4"],
    lead: "G5 . A#5 . G5 . F5 . D#5 . F5 . G5 - - . A#5 - - . G5 . D#5 . C5 - - - . . . . D#5 . G5 . G#5 . G5 . F5 . D#5 . C5 - - . D5 - - . F5 - - . A#5 - - - . . . .",
    leadB: "A#5 - - - - - G5 - D#6 - - - D6 - - - C6 - - - A#5 - - - G5 - - - - - - - G#5 - - - - - G5 - D#5 - - - C6 - - - A#5 - - - - - - - D6 - - - F6 - - -",
    leadVoice: "glass",
    leadBVoice: "saw",
    bass: "0 - . 0 - . 0 . 12 - . 7 - . 5 .",
    bassStyle: "saw",
    arp: "1 2 3 1^ 3 2 1 2 3 1^ 3 2 1 2 3 2",
    drums: FOUR,
    sections: [[0, "pad arp"], [8, "kick snare hat bass arp pad"], [14, FULL], [31, "half snare hat bass pad leadB"], [48, "kick snare hat open bass arp pad lead"], [71, "kick clap hat open bass arp pad leadB"], [82, FULL], [106, "pad arp"]],
    length: 110,
  }),

  "circuit-rush": song({
    bpm: 128,
    chords: ["A1 A3 C4 E4", "F1 A3 C4 F4", "C2 G3 C4 E4", "G1 G3 B3 D4"],
    lead: "E5 . E5 . D5 . C5 . D5 . E5 . . . A4 . C5 . C5 . B4 . A4 . C5 - - . F5 - - . G5 . G5 . F5 . E5 . D5 . E5 . . . C5 . D5 - - . B4 - - . G4 . B4 . D5 . G5 .",
    leadB: "A5 . A4 . A5 . G5 . E5 . C5 . E5 . G5 . F5 . F4 . F5 . E5 . C5 . A4 . C5 . E5 . E5 . E4 . E5 . D5 . C5 . G4 . C5 . E5 . D5 . G4 . B4 . D5 . G5 - - - . . . .",
    leadVoice: "square",
    bass: "0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 7",
    bassStyle: "pluck",
    arp: "1 2 3 2 1 2 3 2 1 2 3 2 1 2 3 1^",
    arpVoice: "square",
    drums: FOUR,
    sections: [[0, "hat arp bass"], [8, FULL], [28, "kick snare hat open bass arp pad leadB"], [42, "half clap hat bass pad leadB"], [57, "kick snare clap hat open bass arp pad lead"], [75, "half clap hat bass pad leadB"], [88, "kick snare hat open bass arp pad leadB"], [98, "kick snare clap hat open bass arp pad lead"], [110, "pad arp"]],
    length: 114,
  }),

  "core-meltdown": song({
    bpm: 136,
    chords: ["D2 D4 F4 A4", "A#1 D4 F4 A#4", "F2 C4 F4 A4", "C2 C4 E4 G4"],
    lead: "D5 . F5 . A5 . D6 - - . C6 . A5 . G5 . F5 - - . D5 - - . A#4 . D5 . F5 . G5 . A5 - - . G5 . F5 . C5 . F5 . A5 . C6 . E5 - - . D5 - - . C5 - - - E5 . G5 .",
    leadB: "A5 . A5 . A5 . D6 . A5 . G5 . F5 . D5 . A#5 . A#5 . A#5 . D6 . A#5 . A5 . G5 . F5 . C6 . C6 . C6 . F6 . C6 . A5 . G5 . F5 . G5 . G5 . E5 . C5 . E5 - - - G5 - - -",
    leadVoice: "saw",
    leadBVoice: "square",
    bass: "0 0 12 0 0 12 0 12 0 0 12 0 0 12 7 12",
    bassStyle: "saw",
    arp: "1 2 3 1^ 1 2 3 1^ 1 2 3 1^ 3 2 1 2",
    arpVoice: "sawtooth",
    drums: { ...FOUR, hat: "x.x.x.x.x.x.x.x." },
    sections: [[0, "kick hat bass pad"], [8, FULL], [27, "kick clap hat open bass arp pad leadB"], [43, "kick snare clap hat bass arp pad leadB"], [56, "kick snare clap hat open bass arp pad lead"], [75, "half clap hat bass pad leadB"], [89, "kick snare clap hat bass arp pad leadB"], [101, "kick snare clap hat open bass arp pad lead"], [120, "pad arp"]],
    length: 124,
  }),
};
