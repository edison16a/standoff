import { song } from "../song";

/**
 * "Neon Drift": F major at 84, for the camera steps. A flute over electric
 * piano and a pad that washes from bar to bar, with a rim and a shaker
 * instead of a snare and hats. No plucks, no crashes.
 */
export const MENU = song({
  bpm: 84,
  swing: 0.18,
  chords: ["F2 A3 C4 E4 G4", "D2 F3 A3 C4 E4", "A#1 A3 D4 F4", "C2 G3 A#3 D4 F4", "A1 G3 C4 E4", "D2 F3 A3 C4 E4", "G1 F3 A#3 D4", "C2 E3 A#3 D4 G4"],
  lead: "A4 - - C5 - - F5 - - - - - E5 - C5 - D5 - - - - - - - . . A4 - C5 - D5 - F5 - - E5 - - D5 - - - C5 - D5 - - - C5 - - - - - - - - - - - . . . .",
  leadB: "E5 - - G5 - - A5 - - - G5 - E5 - - - F5 - - - - - E5 - D5 - - - A4 - - - A#4 - - D5 - - F5 - - - G5 - A5 - - - G5 - - - - - - - E5 - - - - - - -",
  leadVoice: "flute",
  bass: "0 - - - - - - . 7 - - . . . . .",
  bassStyle: "round",
  arp: "1 . . 2 . . 3 . . 4 . . 3 . . .",
  keys: "x.....x.....x...",
  drums: { kick: "x.........x.....", snare: "....x.......x...", hat: "..x...x...x...x." },
  padVoice: "wash",
  crash: false,
  // The flute's tune over the first four chords, its answer over the next four, twice, with the kick out at the end to breathe.
  sections: [
    [0, "kick rim shaker bass keys pad lead"],
    [16, "kick rim shaker bass keys pad leadB"],
    [32, "kick rim shaker bass keys pad lead"],
    [48, "rim shaker bass keys pad leadB"],
  ],
  length: 64,
});
