import { song, type Song } from "./song";

/**
 * The two Demon levels' songs, faster and harder than the rest. Like the
 * others, each is four bars of chords with a hook on top, and its
 * sections change on the level's own beats: the drums go to half time
 * for the UFO, the second lead takes over for the ball, and the full
 * song comes back with the cube.
 */

const FULL = "kick snare clap hat open bass arp pad lead";

export const DEMON_SONGS: Record<string, Song> = {
  // "Abyss Runner": D minor at 144, a rolling psy trance. Four on the floor with offbeat hats, a
  // saw bass on every sixteenth but the kick's, and a square hook climbing through i VI VII V.
  "neon-abyss": song({
    bpm: 144,
    chords: ["D2 D4 F4 A4", "A#1 D4 F4 A#4", "C2 C4 E4 G4", "A1 C#4 E4 A4"],
    lead: "D5 . F5 . A5 . D6 . C6 . A5 . F5 . E5 . D5 . F5 . A#5 . D6 . C6 - - . A5 . G5 . C5 . E5 . G5 . C6 . A#5 . G5 . E5 . C5 . C#5 . E5 . A5 - - . C#6 - - . E6 - D6 .",
    leadB: "A5 - - - F5 - - - D5 - - - F5 - A5 - A#5 - - - A5 - - - F5 - - - D5 - - - G5 - - - E5 - - - C5 - - - E5 - G5 - A5 - - - - - - - C#6 - - - E6 - - -",
    leadVoice: "square",
    leadBVoice: "chip",
    bass: "0 . 0 12 0 . 0 12 0 . 0 12 0 . 7 10",
    bassStyle: "saw",
    arp: "1 2 3 1^ 2 3 1^ 3 1 2 3 1^ 2 3 1^ 3",
    arpVoice: "square",
    kit: "hard",
    drums: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x." },
    sections: [
      [0, "kick hat bass pad"],
      [8, FULL],
      [26, "kick snare clap hat open bass arp pad leadB"],
      [35, "half clap hat bass pad leadB"],
      [48, FULL],
      [62, "half clap hat bass pad leadB"],
      [74, "kick snare clap hat bass arp pad leadB"],
      [84, FULL],
      [101, "kick snare clap hat open bass arp pad leadB"],
      [107, FULL],
      [116, "pad arp"],
    ],
    length: 120,
  }),

  // "Inferno": F sharp minor at 150, a snarling drumstep. A broken kick, busy hats, a growling
  // reese bass and a saw hook, answered by a square that leaps octaves over the ball.
  "inferno-gate": song({
    bpm: 150,
    chords: ["F#2 A3 C#4 F#4", "D2 A3 D4 F#4", "E2 G#3 B3 E4", "C#2 F3 G#3 C#4"],
    lead: "F#5 . F#5 . C#6 . A5 . F#5 . G#5 . A5 . B5 . D6 . C#6 . B5 . A5 . F#5 - - . A5 . B5 . E5 . G#5 . B5 . E6 . D6 . B5 . G#5 . E5 . F5 . G#5 . C#6 - - . F6 - - . G#6 - F6 .",
    leadB: "F#6 . F#5 . F#6 . F#5 . A6 . F#6 . C#6 . F#6 . D6 . D5 . D6 . D5 . F#6 . D6 . A5 . D6 . E6 . E5 . E6 . E5 . G#6 . E6 . B5 . E6 . C#6 . C#5 . C#6 . F6 . G#6 - - - F6 - C#6 -",
    leadVoice: "saw",
    leadBVoice: "square",
    bass: "0 - 0 . 12 0 . 0 - 0 12 . 0 . 7 5",
    bassStyle: "reese",
    arp: "1 3 2 1^ 3 2 1 3 1^ 2 3 1 2 1^ 3 2",
    arpVoice: "sawtooth",
    kit: "punch",
    drums: { kick: "x..x..x.x..x..x.", snare: "....x.......x...", hat: "xxx.xxx.xxx.xxxx" },
    sections: [
      [0, "kick hat bass pad"],
      [8, FULL],
      [26, "half clap hat bass pad leadB"],
      [38, "kick snare clap hat bass arp pad leadB"],
      [48, FULL],
      [63, "kick snare clap hat open bass arp pad leadB"],
      [72, "half clap hat bass pad leadB"],
      [84, FULL],
      [102, "half clap hat bass arp pad leadB"],
      [108, "kick snare clap hat bass arp pad leadB"],
      [114, FULL],
      [122, "pad arp"],
    ],
    length: 126,
  }),
};
