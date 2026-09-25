import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { HitSound } from "../engine/moves";
import { vary } from "./mix";

/**
 * The five kinds of impact. Each is a sharp transient, a body with some
 * weight to it and a tail sent into the reverb, pitched a little
 * differently every time. `p` is how hard, 0.3 for a jab to 1 for a
 * finisher at high damage.
 */
type Voice = (engine: AudioEngine, out: AudioNode, wet: AudioNode, at: number, p: number) => void;

const punch: Voice = (engine, out, wet, at, p) => {
  noise(engine, out, at, { filter: "highpass", frequency: 2600, decay: 0.018, peak: 0.35 * p });
  noise(engine, out, at, { filter: "bandpass", frequency: vary(900, 0.1), q: 0.9, decay: 0.08, peak: 0.55 * p });
  tone(engine, out, at, { frequency: vary(150, 0.08), glideTo: 60, decay: 0.12 + p * 0.06, peak: 0.6 * p });
  noise(engine, wet, at, { filter: "bandpass", frequency: 900, q: 0.8, decay: 0.15, peak: 0.2 * p });
};

const kick: Voice = (engine, out, wet, at, p) => {
  // A snap of cloth first, then the thud.
  noise(engine, out, at, { filter: "bandpass", frequency: vary(2400, 0.1), sweepTo: 900, q: 1.2, decay: 0.05, peak: 0.3 * p });
  noise(engine, out, at + 0.01, { filter: "lowpass", frequency: vary(1400, 0.1), decay: 0.09, peak: 0.5 * p });
  tone(engine, out, at + 0.01, { frequency: vary(120, 0.08), glideTo: 48, decay: 0.16 + p * 0.08, peak: 0.65 * p });
  noise(engine, wet, at, { filter: "bandpass", frequency: 1200, q: 0.8, decay: 0.18, peak: 0.2 * p });
};

const slash: Voice = (engine, out, wet, at, p) => {
  const f = vary(3200, 0.08);
  noise(engine, out, at, { filter: "bandpass", frequency: f * 0.5, sweepTo: f * 1.6, q: 2, attack: 0.01, decay: 0.12, peak: 0.45 * p });
  // The steel rings on after the cut.
  for (const [ratio, peak] of [[1, 0.06], [2.76, 0.03], [5.4, 0.015]] as const) {
    tone(engine, out, at, { frequency: vary(1480, 0.03) * ratio, decay: 0.35 + p * 0.3, peak: peak * (0.6 + p) });
  }
  tone(engine, out, at, { frequency: vary(180, 0.08), glideTo: 80, decay: 0.1, peak: 0.35 * p });
  noise(engine, wet, at, { filter: "highpass", frequency: 2500, decay: 0.3, peak: 0.15 * p });
};

const magic: Voice = (engine, out, wet, at, p) => {
  const f = vary(880, 0.06);
  tone(engine, out, at, { type: "triangle", frequency: f * 1.5, glideTo: f * 0.5, decay: 0.22, peak: 0.25 * p });
  tone(engine, out, at, { frequency: f * 2, glideTo: f * 3, decay: 0.3, peak: 0.08 * p });
  noise(engine, out, at, { filter: "bandpass", frequency: 5200, q: 3, decay: 0.25, peak: 0.18 * p });
  tone(engine, out, at, { frequency: vary(140, 0.08), glideTo: 70, decay: 0.14, peak: 0.45 * p });
  for (let i = 0; i < 4; i++) tone(engine, wet, at + 0.03 + i * 0.045, { frequency: f * (2 + i * 0.5), decay: 0.2, peak: 0.04 * p });
};

const slam: Voice = (engine, out, wet, at, p) => {
  tone(engine, out, at, { frequency: vary(78, 0.05), glideTo: 32, decay: 0.4 + p * 0.3, peak: 0.85 * p });
  noise(engine, out, at, { filter: "lowpass", frequency: vary(900, 0.1), decay: 0.25, peak: 0.6 * p });
  noise(engine, out, at, { filter: "highpass", frequency: 2200, decay: 0.03, peak: 0.3 * p });
  // Rubble: a few small knocks as the ground settles.
  for (let i = 0; i < 4; i++) noise(engine, out, at + 0.06 + Math.random() * 0.25, { filter: "bandpass", frequency: 500 + Math.random() * 700, q: 2, decay: 0.05, peak: 0.12 * p });
  noise(engine, wet, at, { filter: "lowpass", frequency: 1200, decay: 0.6, peak: 0.3 * p });
};

export const HIT_VOICES: Record<HitSound, Voice> = { punch, kick, slash, magic, slam };

/** The big KO boom: a falling sub drop, an explosion of noise and a long tail. */
export function koBoom(engine: AudioEngine, out: AudioNode, wet: AudioNode, at: number): void {
  tone(engine, out, at, { frequency: 110, glideTo: 28, decay: 1.2, peak: 0.9 });
  tone(engine, out, at, { type: "triangle", frequency: 220, glideTo: 55, decay: 0.5, peak: 0.25 });
  noise(engine, out, at, { filter: "lowpass", frequency: 2400, sweepTo: 200, attack: 0.005, decay: 0.9, peak: 0.7 });
  noise(engine, out, at, { filter: "highpass", frequency: 3000, decay: 0.08, peak: 0.4 });
  noise(engine, wet, at, { filter: "lowpass", frequency: 1600, decay: 1.4, peak: 0.45 });
  // A bright star twinkle as the fighter vanishes past the edge.
  tone(engine, out, at + 0.12, { type: "triangle", frequency: 1760, glideTo: 3520, decay: 0.35, peak: 0.08 });
}
