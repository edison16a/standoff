import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi } from "@/platform/audio/voices";

/**
 * The home screen tune: a slow, flowing ambient loop. Soft pads swell in
 * and overlap the next chord as they fade, a round bass holds under
 * them, and a gentle melody glides on top. No drums and no plucks, so it
 * reads as one continuous wash rather than a string of beeps.
 */
export const LOBBY_BPM = 68;

const BAR_STEPS = 16;

/** Eight bars in C: Fmaj7, Em7, Dm9, Cmaj7, then Fmaj7, G6, Am7, Gsus. Root first. */
const CHORDS = [
  [41, 57, 60, 64, 69],
  [40, 55, 59, 62, 67],
  [38, 53, 57, 60, 64],
  [36, 52, 55, 59, 64],
  [41, 57, 60, 64, 69],
  [43, 55, 59, 62, 64],
  [45, 57, 60, 64, 67],
  [43, 55, 60, 62, 67],
];

/** Melody notes as [step within the bar, MIDI note, length in steps], per bar. */
const MELODY: [number, number, number][][] = [
  [[0, 76, 8], [8, 72, 8]],
  [[0, 74, 12], [12, 71, 4]],
  [[0, 72, 8], [8, 69, 8]],
  [[0, 71, 16]],
  [[0, 69, 6], [6, 72, 6], [12, 76, 4]],
  [[0, 79, 8], [8, 76, 8]],
  [[0, 76, 10], [10, 72, 6]],
  [[0, 74, 16]],
];

export const STEPS_PER_LOOP = CHORDS.length * BAR_STEPS;

interface Swell {
  type?: OscillatorType;
  frequency: number;
  detune?: number;
  peak: number;
  attack: number;
  hold: number;
  release: number;
}

/** A note that fades in, holds and fades out slowly, the building block of a pad. */
function swell(engine: AudioEngine, out: AudioNode, at: number, options: Swell): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = options.type ?? "sine";
  osc.frequency.value = options.frequency;
  osc.detune.value = options.detune ?? 0;
  const end = at + options.attack + options.hold + options.release;
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(options.peak, at + options.attack);
  gain.gain.setValueAtTime(options.peak, at + options.attack + options.hold);
  gain.gain.linearRampToValueAtTime(0, end);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(end + 0.05);
  osc.onended = () => gain.disconnect();
}

export function playLobbyStep(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const sixteenth = 60 / LOBBY_BPM / 4;
  const bar = Math.floor(step / BAR_STEPS) % CHORDS.length;
  const inBar = step % BAR_STEPS;
  const barS = sixteenth * BAR_STEPS;

  if (inBar === 0) {
    const chord = CHORDS[bar]!;
    // The release runs well into the next bar, so chords melt into each other.
    const pad = { attack: barS * 0.35, hold: barS * 0.5, release: barS * 0.9 };
    for (const note of chord.slice(1)) {
      swell(engine, out, at, { ...pad, type: "sawtooth", frequency: midi(note), detune: -8, peak: 0.011 });
      swell(engine, out, at, { ...pad, type: "sawtooth", frequency: midi(note), detune: 8, peak: 0.011 });
      swell(engine, out, at, { ...pad, frequency: midi(note), peak: 0.02 });
    }
    swell(engine, out, at, { frequency: midi(chord[0]! - 12), attack: 0.4, hold: barS * 0.7, release: barS * 0.5, peak: 0.16 });
    swell(engine, out, at, { type: "triangle", frequency: midi(chord[0]!), attack: 0.6, hold: barS * 0.5, release: barS * 0.6, peak: 0.03 });
  }

  for (const [start, note, length] of MELODY[bar]!) {
    if (start !== inBar) continue;
    const held = length * sixteenth;
    swell(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.18, hold: held * 0.6, release: held * 0.9, peak: 0.045 });
    swell(engine, out, at, { frequency: midi(note + 12), attack: 0.25, hold: held * 0.4, release: held * 0.7, peak: 0.01 });
  }
}
