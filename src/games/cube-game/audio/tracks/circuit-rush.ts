import { song } from "../song";

/**
 * Circuit Rush: B minor at 128, chiptune electro for a green circuit
 * town. Square waves for the tune, the answer and a fast arpeggio, a
 * plucked bass driving on the eighths, and a busy hat on every sixteenth.
 */
export const CIRCUIT_RUSH = song({
  bpm: 128,
  chords: ["B1 B3 D4 F#4", "G1 B3 D4 G4", "D2 A3 D4 F#4", "A1 A3 C#4 E4"],
  lead: [
    "F#5 . F#5 . E5 . D5 . E5 . F#5 . . . B4 .",
    "D5 . D5 . C#5 . B4 . D5 - - . G5 - - .",
    "A5 . A5 . G5 . F#5 . E5 . F#5 . . . D5 .",
    "E5 - - . C#5 - - . A4 . C#5 . E5 . A5 .",
  ].join(" "),
  leadB: [
    "B5 . B4 . B5 . A5 . F#5 . D5 . F#5 . A5 .",
    "G5 . G4 . G5 . F#5 . D5 . B4 . D5 . F#5 .",
    "F#5 . F#4 . F#5 . E5 . D5 . A4 . D5 . F#5 .",
    "E5 . A4 . C#5 . E5 . A5 - - - . . . .",
  ].join(" "),
  leadVoice: "square",
  bass: "0 . 0 . 12 . 0 . 0 . 0 . 12 . 7 .",
  bassStyle: "pluck",
  arp: "1 2 3 1^ 1 2 3 1^ 1 2 3 1^ 3 2 1 2",
  arpVoice: "square",
  drums: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx" },
  sections: [
    [0, "hat arp bass"],
    [8, "kick snare hat bass arp pad lead"],
    [28, "kick snare hat open bass arp pad leadB"],
    [42, "half clap hat bass pad leadB"],
    [57, "kick snare clap hat open bass arp pad lead"],
    [75, "half clap hat bass pad leadB"],
    [88, "kick snare hat open bass arp pad leadB"],
    [98, "kick snare clap hat open bass arp pad lead"],
    [110, "pad arp"],
  ],
  length: 114,
});
