import { song } from "../song";

/**
 * Core Meltdown: E Phrygian at 136, dark and heavy for the volcano. The
 * flat second over E minor gives it menace. A broken beat with a busy
 * hat, a rolling saw bass, a saw tune and a stabbing square answer.
 */
export const CORE_MELTDOWN = song({
  bpm: 136,
  chords: ["E2 B3 E4 G4", "F2 A3 C4 F4", "G2 B3 D4 G4", "F2 A3 C4 E4"],
  lead: [
    "E5 . G5 . B5 . E6 - - . D6 . B5 . G5 .",
    "F5 - - . A5 - - . C6 . A5 . F5 . E5 .",
    "D5 . G5 . B5 . D6 - - . B5 . G5 . D5 .",
    "C6 - - . B5 - - . A5 - - . F5 . E5 .",
  ].join(" "),
  leadB: [
    "B5 . B5 . E6 . B5 . G5 . E5 . G5 . B5 .",
    "C6 . C6 . F6 . C6 . A5 . F5 . A5 . C6 .",
    "D6 . D6 . G6 . D6 . B5 . G5 . B5 . D6 .",
    "C6 . A5 . F5 . E5 - - - . . F5 - E5 -",
  ].join(" "),
  leadVoice: "saw",
  leadBVoice: "square",
  bass: "0 - . 0 12 . 0 . 0 - . 0 7 . 12 .",
  bassStyle: "saw",
  arp: "1 3 2 1^ 1 3 2 1^ 1 3 2 1^ 3 2 1 3",
  arpVoice: "sawtooth",
  // A broken beat: the kick skips the middle of the bar, so it pushes instead of marching.
  drums: { kick: "x.........x.x...", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx" },
  sections: [
    [0, "kick hat bass pad"],
    [8, "kick snare hat bass arp pad lead"],
    [27, "kick clap hat open bass arp pad leadB"],
    [43, "kick snare clap hat bass arp pad leadB"],
    [56, "kick snare clap hat open bass arp pad lead"],
    [75, "half clap hat bass pad leadB"],
    [89, "kick snare clap hat bass arp pad leadB"],
    [101, "kick snare clap hat open bass arp pad lead"],
    [120, "pad arp"],
  ],
  length: 124,
});
