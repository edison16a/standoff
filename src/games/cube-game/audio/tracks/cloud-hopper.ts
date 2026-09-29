import { song } from "../song";

/**
 * Cloud Hopper: E flat major at 122, airy trance for a sky of floating
 * blocks. A rolling arpeggio, a bass on every off beat, a glass tune and
 * a wide saw answer that soars over the long UFO flight in half time.
 */
export const CLOUD_HOPPER = song({
  bpm: 122,
  chords: ["D#2 G3 A#3 D4", "C2 D#3 G3 A#3", "G#1 C4 D#4 G4", "A#1 D4 F4 G#4"],
  lead: [
    "G5 . A#5 . G5 . F5 . D#5 . F5 . G5 - - .",
    "A#5 - - . G5 . D#5 . C5 - - - . . . .",
    "D#5 . G5 . G#5 . G5 . F5 . D#5 . C5 - - .",
    "D5 - - . F5 - - . A#5 - - - . . . .",
  ].join(" "),
  leadB: [
    "A#5 - - - - - G5 - D#6 - - - D6 - - -",
    "C6 - - - A#5 - - - G5 - - - - - - -",
    "G#5 - - - - - G5 - D#5 - - - C6 - - -",
    "A#5 - - - - - - - D6 - - - F6 - - -",
  ].join(" "),
  leadVoice: "glass",
  leadBVoice: "saw",
  bass: ". . 0 . . . 0 . . . 12 . . . 0 .",
  bassStyle: "saw",
  arp: "1 2 3 1^ 2 3 1^ 3 1 2 3 1^ 2 3 1^ 3",
  drums: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x." },
  sections: [
    [0, "pad arp"],
    [8, "kick hat bass arp pad"],
    [14, "kick clap hat open bass arp pad lead"],
    [31, "half hat bass pad arp leadB"],
    [48, "kick clap hat open bass arp pad lead"],
    [71, "kick snare hat open bass arp pad leadB"],
    [82, "kick clap hat open bass arp pad lead"],
    [106, "pad arp"],
  ],
  length: 110,
});
