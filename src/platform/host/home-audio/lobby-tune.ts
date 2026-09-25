import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The home screen tune: a slow lo-fi loop of four seventh chords with a
 * soft electric piano, a round sub bass, a lazy kick and brushed hats.
 * It sits in the background while people pick a game, so it stays warm
 * and low with a small catchy bell hook on top.
 */
export const LOBBY_BPM = 84;

const _ = null;

/** Fmaj7, Em7, Dm7, Cmaj7 then back round. Root first, as MIDI notes. */
const CHORDS = [
  [41, 57, 60, 64, 69],
  [40, 55, 59, 62, 67],
  [38, 53, 57, 60, 65],
  [36, 52, 55, 59, 64],
];

/** Thirty two sixteenths, so the hook answers itself across two bars. */
const HOOK: (number | null)[] = [
  76, _, _, 79, _, _, 81, _, _, _, 79, _, 76, _, _, _,
  _, _, 74, _, 76, _, _, _, 72, _, _, _, _, _, _, _,
];

/** Sixteenths in a bar where each drum lands. The kick lags a touch for swing. */
const KICK = new Set([0, 7, 10]);
const SNARE = new Set([4, 12]);

export const STEPS_PER_LOOP = CHORDS.length * 16;

export function playLobbyStep(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const sixteenth = 60 / LOBBY_BPM / 4;
  const inBar = step % 16;
  const chord = CHORDS[Math.floor(step / 16) % CHORDS.length]!;
  // Every other offbeat hat is pushed late, which is where the lazy feel comes from.
  const swing = inBar % 2 === 1 ? sixteenth * 0.18 : 0;

  if (KICK.has(inBar)) tone(engine, out, at, { frequency: 110, glideTo: 42, decay: 0.28, peak: 0.32 });
  if (SNARE.has(inBar)) noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 0.7, decay: 0.16, peak: 0.07 });
  if (inBar % 2 === 1) noise(engine, out, at + swing, { filter: "highpass", frequency: 7000, decay: 0.05, peak: inBar % 4 === 3 ? 0.035 : 0.02 });

  if (inBar === 0 || inBar === 10) {
    tone(engine, out, at, { frequency: midi(chord[0]!), attack: 0.02, decay: sixteenth * 7, peak: 0.2 });
  }
  // Electric piano: a sine with a detuned triangle, rolled a little so it sounds played.
  if (inBar === 0 || inBar === 6 || inBar === 11) {
    chord.slice(1).forEach((note, i) => {
      const t = at + i * 0.018 + swing;
      tone(engine, out, t, { frequency: midi(note), attack: 0.01, decay: sixteenth * 5, peak: 0.028 });
      tone(engine, out, t, { type: "triangle", frequency: midi(note), detune: 7, attack: 0.01, decay: sixteenth * 3, peak: 0.012 });
    });
  }

  const hook = HOOK[step % HOOK.length];
  if (hook !== null && hook !== undefined && Math.floor(step / 32) % 2 === 0) {
    tone(engine, out, at, { frequency: midi(hook), decay: 0.9, peak: 0.05 });
    tone(engine, out, at, { frequency: midi(hook + 19), decay: 0.35, peak: 0.012 });
  }
}
