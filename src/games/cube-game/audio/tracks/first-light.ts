import { song } from "../song";

/**
 * First Light: G major at 110, dreamy synth pop for a night city and a
 * first level. A bell tune over electric piano, a lazy swung beat with a
 * rim before the snare comes in, and a glass answer where the UFO floats.
 */
export const FIRST_LIGHT = song({
  bpm: 110,
  swing: 0.14,
  chords: ["G2 B3 D4 F#4", "E2 G3 B3 D4", "C2 B3 E4 G4", "D2 F#3 A3 E4"],
  lead: [
    "B4 . D5 . F#5 - - . E5 . D5 . B4 - - .",
    "G4 . B4 . D5 - - - . . E5 . D5 . B4 .",
    "C5 . E5 . G5 - - . F#5 . E5 . C5 - - .",
    "D5 - - . A4 . D5 . E5 - - - - - . .",
  ].join(" "),
  leadB: [
    "D6 - - - B5 - - . A5 - - . F#5 - - .",
    "G5 - - - - - . . E5 - - . D5 - - .",
    "E5 - - . G5 - - . B5 - - . C6 - - .",
    "A5 - - - - - - - F#5 - - - - - . .",
  ].join(" "),
  leadVoice: "bell",
  leadBVoice: "glass",
  bass: "0 - - - - - 0 . 7 - - . 5 - . .",
  bassStyle: "round",
  arp: "1 . 2 . 3 . 4 . 1^ . 4 . 3 . 2 .",
  keys: "x.....x...x.....",
  drums: { kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
  // Sections sit on the level's own beats: the UFO stretch gets the glass answer and no kick.
  sections: [
    [0, "pad arp keys shaker"],
    [8, "kick rim shaker bass arp pad keys"],
    [16, "kick snare hat bass arp pad keys lead"],
    [46, "shaker bass arp pad keys leadB"],
    [60, "kick snare hat open bass arp pad keys lead"],
    [84, "pad arp keys"],
  ],
  length: 88,
});
