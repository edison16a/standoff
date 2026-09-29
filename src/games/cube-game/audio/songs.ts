import { DEMON_SONGS } from "./demon-songs";
import { song, type Song } from "./song";

/**
 * One song per level plus the menu's. Each level has its own key, tempo
 * and style, matched to its look: city pop, nu disco, trance, electro
 * chiptune and a dark breakbeat, then psy trance and drumstep for the
 * two Demon levels (`demon-songs.ts`). Each is four bars of chords with a hook
 * on top, arranged on the level's own beats: the lead changes where the
 * mode changes, and the drums drop out to float through the UFO.
 */

const FOUR = { kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x." };

const FULL = "kick snare hat bass arp pad lead";

export const SONGS: Record<string, Song> = {
  // "Neon Drift": F major at 84, for the camera steps. A flute over electric piano and a pad that
  // washes from bar to bar, with a rim and a shaker instead of a snare and hats. No plucks, no crashes.
  menu: song({
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
    kit: "soft",
    crash: false,
    // The flute's tune over the first four chords, its answer over the next four, twice, with the kick out at the end to breathe.
    sections: [[0, "kick rim shaker bass keys pad lead"], [16, "kick rim shaker bass keys pad leadB"], [32, "kick rim shaker bass keys pad lead"], [48, "rim shaker bass keys pad leadB"]],
    length: 64,
  }),

  // "Sunrise Avenue": F major at 110, city pop for the night city. Electric piano offbeats, a bell hook
  // over the IV V iii vi turn, a soft kick and a lazy swing.
  "first-light": song({
    bpm: 110,
    swing: 0.12,
    chords: ["A#1 A3 D4 F4 C5", "C2 A#3 E4 G4", "A1 G3 C4 E4", "D2 F3 A3 C4 E4"],
    lead: "A5 - - G5 - - F5 - D5 - - - C5 - D5 - E5 - - F5 - - G5 - - - . . E5 . C5 . E5 - - D5 - - C5 - E5 - - - G5 - A5 - F5 - - - - - E5 - D5 - - - . . . .",
    leadB: "D6 - - - C6 - - - A5 - - - F5 - G5 - G5 - - - - - E5 - C6 - - - A#5 - A5 - A5 - - - G5 - - - E5 - - - C5 - E5 - D5 - - - - - - - F5 - - - A5 - - -",
    leadVoice: "bell",
    leadBVoice: "glass",
    bass: "0 - - . . . 0 - . . 0 . 7 - . .",
    bassStyle: "round",
    arp: "1 . 3 . 2 . 4 . 1 . 3 . 2 . 4 .",
    keys: "..x...x...x..x..",
    kit: "soft",
    drums: { kick: "x.....x...x.....", snare: "....x.......x...", hat: "..x...x...x...x." },
    sections: [[0, "pad keys shaker"], [8, "kick rim shaker bass keys pad"], [16, "kick clap hat bass arp keys pad lead"], [46, "keys arp leadB shaker bass pad"], [60, "kick clap hat open bass arp keys pad lead"], [84, "pad keys"]],
    length: 88,
  }),

  // "Mirage Disco": G minor at 116, nu disco for the sunset desert. Octave bass, open hats on the
  // offbeat, a brassy square riff answered by a singing saw, and a little funk swing.
  "sunset-bounce": song({
    bpm: 116,
    swing: 0.08,
    chords: ["G1 A#3 D4 F4 A4", "C2 A#3 D4 E4 G4", "D#2 G3 A#3 D4", "D2 F#3 A3 C4"],
    lead: "G5 . A#5 . . G5 . D5 F5 . G5 . . . A#5 . C6 . A#5 . G5 . . E5 . G5 - - . . . . D#5 . F5 . G5 . A#5 . . G5 . F5 D#5 . D5 . F#5 - - . A5 - - . D5 - - - . . . .",
    leadB: "D6 - - . D6 . C6 . A#5 - - . A5 . G5 . G5 - - . E5 . G5 . A#5 - - - A5 - G5 - G5 - - . F5 . D#5 . D5 - - . A#4 . D5 . C5 - - - A4 - - - D5 - - - F#5 - A5 -",
    leadVoice: "square",
    leadBVoice: "saw",
    bass: "0 . . 0 12 . 0 . . 0 7 . 10 . 12 .",
    bassStyle: "pluck",
    arp: "1 . 3 1^ . 3 2 . 1 . 3 1^ . 4 2 .",
    arpVoice: "square",
    kit: "punch",
    drums: { kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    sections: [[0, "pad hat bass"], [8, "kick clap hat open bass pad arp"], [16, `${FULL} clap open`], [34, "kick clap hat open bass arp pad leadB"], [48, `${FULL} clap open`], [80, "kick clap shaker open bass arp pad leadB"], [91, `${FULL} clap open`], [106, "pad arp"]],
    length: 110,
  }),

  // "Skyward": E flat major at 122, airy trance for the violet sky. A glass hook over sixteenth
  // arpeggios and a pumping pad, with the drums halved so the UFO floats.
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
    arpVoice: "triangle",
    kit: "punch",
    drums: FOUR,
    sections: [[0, "pad arp"], [8, "kick snare hat bass arp pad"], [14, FULL], [31, "half snare hat bass pad leadB"], [48, "kick snare hat open bass arp pad lead"], [71, "kick clap hat open bass arp pad leadB"], [82, FULL], [106, "pad arp"]],
    length: 110,
  }),

  // "Overclock": E minor at 128, electro chiptune for the circuit town. A chip lead in quick
  // sixteenths, a broken electro kick, a tight kit and a pulsing pluck bass.
  "circuit-rush": song({
    bpm: 128,
    chords: ["E2 G3 B3 E4", "C2 G3 C4 E4", "D2 F#3 A3 D4", "B1 F#3 A3 D#4"],
    lead: "E5 . G5 . B5 . E6 . D6 . B5 . G5 . A5 . G5 . E5 . C5 . E5 . G5 - - . E5 . C6 . A5 . F#5 . D5 . F#5 . A5 . D6 . C6 . A5 . B5 - - . A5 . F#5 . D#5 - - . B4 - - .",
    leadB: "B5 - - - G5 - - - E5 - - - G5 - B5 - C6 - - - B5 - - - G5 - - - E5 - - - D6 - - - C6 - - - A5 - - - F#5 - A5 - B5 - - - - - - - D#6 - - - F#6 - - -",
    leadVoice: "chip",
    leadBVoice: "square",
    bass: "0 0 . 0 . 0 12 . 0 0 . 0 . 12 7 .",
    bassStyle: "pluck",
    arp: "1 3 2 1^ 1 3 2 1^ 1 3 2 1^ 1 3 2 1^",
    arpVoice: "square",
    kit: "tight",
    drums: { kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    sections: [[0, "hat arp bass"], [8, FULL], [28, "kick snare hat open bass arp pad leadB"], [42, "half clap hat bass pad leadB"], [57, "kick snare clap hat open bass arp pad lead"], [75, "half clap hat bass pad leadB"], [88, "kick snare hat open bass arp pad leadB"], [98, "kick snare clap hat open bass arp pad lead"], [110, "pad arp"]],
    length: 114,
  }),

  // "Meltdown": C minor at 136, dark breakbeat for the volcano. A growling bass, a hard kit on a
  // broken beat, and a saw hook over i VI III V with the major V for the drama.
  "core-meltdown": song({
    bpm: 136,
    chords: ["C2 C4 D#4 G4", "G#1 C4 D#4 G#4", "D#2 A#3 D#4 G4", "G1 B3 D4 G4"],
    lead: "G5 . G5 . D#6 . D6 . C6 . G5 . D#5 . G5 . G#5 . G#5 . C6 . D#6 . D6 - - . C6 . G#5 . G5 . A#5 . D#6 . G6 . F6 . D#6 . D6 . A#5 . B5 - - . D6 - - . G5 - - . F5 . D5 .",
    leadB: "C6 . C5 . C6 . C5 . D#6 . C6 . G5 . C6 . C6 . C5 . C6 . C5 . G#5 . C6 . D#6 . C6 . A#5 . A#4 . A#5 . A#4 . G5 . A#5 . D#6 . A#5 . B5 . B4 . B5 . D6 . G6 - - - F6 - D6 -",
    leadVoice: "saw",
    leadBVoice: "square",
    bass: "0 - 0 . 0 12 . 0 - 0 . 12 0 . 7 10",
    bassStyle: "reese",
    arp: "1 2 3 1^ 3 2 1 2 1 2 3 1^ 3 2 1 3",
    arpVoice: "sawtooth",
    kit: "hard",
    drums: { kick: "x.....x...x..x..", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx" },
    sections: [[0, "kick hat bass pad"], [8, FULL], [27, "kick clap hat open bass arp pad leadB"], [43, "kick snare clap hat bass arp pad leadB"], [56, "kick snare clap hat open bass arp pad lead"], [75, "half clap hat bass pad leadB"], [89, "kick snare clap hat bass arp pad leadB"], [101, "kick snare clap hat open bass arp pad lead"], [120, "pad arp"]],
    length: 124,
  }),

  ...DEMON_SONGS,
};
