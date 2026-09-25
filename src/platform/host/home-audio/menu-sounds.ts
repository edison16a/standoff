import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The home screen's interface sounds. All three are tuned to the lobby
 * tune's key of C so they sound part of the music, never on top of it.
 */

/** Moving between games: a short round bubble pop, pitched by position so the row feels like a scale. */
export function playPop(engine: AudioEngine, index: number): void {
  const at = engine.now + 0.005;
  const scale = [72, 74, 76, 79, 81];
  const note = scale[index % scale.length]! + (index >= scale.length ? 12 : 0);
  const out = engine.bus("ui");
  tone(engine, out, at, { frequency: midi(note) * 0.7, glideTo: midi(note) * 1.25, attack: 0.002, decay: 0.07, peak: 0.35 });
  tone(engine, out, at, { type: "triangle", frequency: midi(note + 12), attack: 0.002, decay: 0.05, peak: 0.08 });
}

/** Choosing a game with a click: a soft two note bell chime. */
export function playChime(engine: AudioEngine): void {
  const at = engine.now + 0.005;
  const out = engine.bus("ui");
  [79, 84].forEach((note, i) => {
    tone(engine, out, at + i * 0.07, { frequency: midi(note), attack: 0.004, decay: 0.7, peak: 0.22 });
    tone(engine, out, at + i * 0.07, { frequency: midi(note + 19), attack: 0.004, decay: 0.25, peak: 0.05 });
  });
}

/**
 * Starting a game: a rising whoosh into a punchy low hit and a wide bright
 * chord with sparkles, the moment the lobby hands over to the game.
 */
export function playStart(engine: AudioEngine): void {
  const at = engine.now + 0.01;
  const out = engine.bus("ui");
  noise(engine, out, at, { filter: "bandpass", frequency: 400, sweepTo: 6000, q: 1.4, attack: 0.3, decay: 0.12, peak: 0.25 });
  const hit = at + 0.36;
  tone(engine, out, hit, { frequency: 150, glideTo: 45, attack: 0.003, decay: 0.45, peak: 0.9 });
  noise(engine, out, hit, { filter: "lowpass", frequency: 1800, decay: 0.18, peak: 0.35 });
  for (const [i, note] of [60, 67, 72, 76, 79].entries()) {
    tone(engine, out, hit + i * 0.012, { type: "sawtooth", frequency: midi(note), attack: 0.01, decay: 1.4, peak: 0.05 });
    tone(engine, out, hit + i * 0.012, { frequency: midi(note), detune: 6, attack: 0.01, decay: 1.8, peak: 0.12 });
  }
  [84, 88, 91, 96].forEach((note, i) => {
    tone(engine, out, hit + 0.08 + i * 0.06, { frequency: midi(note), attack: 0.002, decay: 0.4, peak: 0.09 });
  });
  noise(engine, out, hit, { filter: "highpass", frequency: 8000, decay: 1.2, peak: 0.08 });
}
