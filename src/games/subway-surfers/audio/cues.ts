import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "./voices";
import type { PowerKind } from "../engine/types";
import { vary } from "./vary";

/**
 * The game's musical cues: power ups, zones, the countdown and the
 * little ticks of the tutorial. All sit in G so they belong to the tune.
 */

/** Each power up has its own root, so players learn which one they grabbed by ear. */
const ROOTS: Record<PowerKind, number> = { boots: 67, hoverboard: 69, magnet: 71, double: 74, jetpack: 62 };

/** A thump, a rising arpeggio with sparkle on top, and a shimmer to finish. */
export function power(engine: AudioEngine, out: AudioNode, at: number, kind: PowerKind): void {
  const root = ROOTS[kind];
  const cents = (Math.random() - 0.5) * 12;
  tone(engine, out, at, { frequency: 150, glideTo: 60, decay: 0.2, peak: 0.3 });
  noise(engine, out, at, { filter: "bandpass", frequency: 600, sweepTo: 5000, q: 1.2, attack: 0.03, decay: 0.3, peak: 0.12 });
  [0, 4, 7, 12, 16, 19].forEach((n, i) => {
    const t = at + i * 0.045;
    tone(engine, out, t, { type: "triangle", frequency: midi(root + n), detune: cents, decay: 0.18, peak: 0.08 });
    tone(engine, out, t, { frequency: midi(root + n + 12), detune: cents, decay: 0.35, peak: 0.05 });
  });
  tone(engine, out, at + 0.27, { frequency: midi(root + 24), detune: cents + 5, decay: 0.8, peak: 0.05 });
  noise(engine, out, at + 0.2, { filter: "highpass", frequency: 6000, sweepTo: 10000, decay: 0.6, peak: 0.07 });
}

/** A falling three notes as a power up runs out. */
export function powerEnd(engine: AudioEngine, out: AudioNode, at: number): void {
  [79, 74, 67].forEach((n, i) => {
    tone(engine, out, at + i * 0.07, { type: "triangle", frequency: midi(n) * vary(0.005), decay: 0.16, peak: 0.07 });
    tone(engine, out, at + i * 0.07, { frequency: midi(n - 12), decay: 0.2, peak: 0.05 });
  });
  noise(engine, out, at, { filter: "bandpass", frequency: 3000, sweepTo: 600, q: 1, decay: 0.3, peak: 0.05 });
}

/** A new zone and a higher multiplier: a bright rising fourth chord and a cymbal swell. */
export function level(engine: AudioEngine, out: AudioNode, at: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 4000, attack: 0.25, decay: 0.1, peak: 0.08 });
  [67, 71, 74, 79].forEach((n, i) => {
    tone(engine, out, at + 0.25 + i * 0.07, { type: "triangle", frequency: midi(n), decay: 0.35, peak: 0.07 });
    tone(engine, out, at + 0.25 + i * 0.07, { frequency: midi(n + 12), decay: 0.5, peak: 0.04 });
  });
  tone(engine, out, at + 0.25, { frequency: midi(43), decay: 0.6, peak: 0.3 });
  noise(engine, out, at + 0.3, { filter: "highpass", frequency: 6000, decay: 0.8, peak: 0.1 });
}

export function countdown(engine: AudioEngine, out: AudioNode, at: number, go: boolean): void {
  if (go) {
    // GO: a punchy chord hit with a low boom under it.
    for (const n of [67, 74, 79]) tone(engine, out, at, { type: "triangle", frequency: midi(n), decay: 0.7, peak: 0.1 });
    tone(engine, out, at, { frequency: midi(91), decay: 0.4, peak: 0.05 });
    tone(engine, out, at, { frequency: 140, glideTo: 45, decay: 0.35, peak: 0.45 });
    noise(engine, out, at, { filter: "highpass", frequency: 5000, decay: 0.5, peak: 0.1 });
    return;
  }
  tone(engine, out, at, { type: "triangle", frequency: midi(67), decay: 0.28, peak: 0.12 });
  tone(engine, out, at, { frequency: midi(79), decay: 0.12, peak: 0.05 });
  noise(engine, out, at, { filter: "highpass", frequency: 6000, decay: 0.02, peak: 0.05 });
}

/** A tutorial move done, or a player calibrated. */
export function tick(engine: AudioEngine, out: AudioNode, at: number): void {
  tone(engine, out, at, { frequency: midi(86), decay: 0.2, peak: 0.1 });
  tone(engine, out, at + 0.08, { frequency: midi(91), decay: 0.3, peak: 0.1 });
  tone(engine, out, at + 0.08, { type: "triangle", frequency: midi(103), decay: 0.1, peak: 0.02 });
}

export function pause(engine: AudioEngine, out: AudioNode, at: number): void {
  tone(engine, out, at, { type: "triangle", frequency: 660, glideTo: 330, decay: 0.3, peak: 0.08 });
  tone(engine, out, at, { frequency: 330, glideTo: 165, decay: 0.35, peak: 0.06 });
}
