import { song } from "../song";

/**
 * Sunset Bounce: F major at 116, sunny nu disco. Four on the floor with
 * open hats on the off beats, an octave bass, electric piano stabs, a
 * warm saw tune and a square riff answering it through the ball parts.
 */
export const SUNSET_BOUNCE = song({
  bpm: 116,
  swing: 0.08,
  chords: ["F2 A3 C4 E4", "D2 F3 A3 C4", "G2 F3 A#3 D4", "C2 E3 A#3 D4"],
  lead: [
    "C5 . A4 . C5 . F5 . . E5 . C5 . A4 . .",
    "D5 . F5 . A5 - - . G5 . F5 . D5 - - .",
    "A#4 . D5 . G5 . . F5 . D5 . . A#4 . C5 .",
    "E5 - - . G5 - - . A#5 - - . A5 . G5 .",
  ].join(" "),
  leadB: [
    "F5 . . F5 . . A5 . C6 . A5 . F5 . . .",
    "D5 . . D5 . . F5 . A5 . F5 . D5 . . .",
    "G5 . . G5 . . A#5 . D6 . A#5 . G5 . . .",
    "E5 . G5 . A#5 . C6 - - - . . A5 - . .",
  ].join(" "),
  leadVoice: "saw",
  leadBVoice: "square",
  bass: "0 . 12 . 0 . 12 . 0 . 12 . 7 . 12 .",
  bassStyle: "pluck",
  arp: "1 . . 3 . . 2 . 1 . . 3 . . 4 .",
  arpVoice: "square",
  keys: "..x...x...x...x.",
  drums: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
  // Keys stab through the cube parts, the square riff and plucks take over for the ball.
  sections: [
    [0, "pad hat bass"],
    [8, "kick clap hat bass pad keys"],
    [16, "kick clap hat open bass keys pad lead"],
    [34, "kick snare hat open bass arp pad leadB"],
    [48, "kick clap hat open bass keys pad lead"],
    [80, "kick snare hat open bass arp pad leadB"],
    [91, "kick clap hat open bass keys pad lead"],
    [106, "pad keys"],
  ],
  length: 110,
});
