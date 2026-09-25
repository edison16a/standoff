import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "./voices";
import { travel, vary } from "./vary";

/**
 * The runner's own sounds. Each is built in layers: a short transient
 * for the attack, a pitched body, and a tail of air or ring, with a
 * little random drift so repeats never sound the same.
 */

/** A major scale, for coin chimes that climb as a streak goes on. */
const SCALE = [0, 2, 4, 5, 7, 9, 11];

/** A bright two note chime, higher with every coin in a streak. */
export function coin(engine: AudioEngine, out: AudioNode, at: number, streak: number): void {
  const step = Math.min(streak - 1, 13);
  const note = 83 + SCALE[step % 7]! + 12 * Math.floor(step / 7);
  // A few cents of drift only, so the streak stays a tune.
  const cents = (Math.random() - 0.5) * 16;
  const level = vary(0.1);
  noise(engine, out, at, { filter: "highpass", frequency: 7000, decay: 0.015, peak: 0.07 * level });
  tone(engine, out, at, { type: "triangle", frequency: midi(note), detune: cents, decay: 0.06, peak: 0.1 * level });
  tone(engine, out, at + 0.055, { type: "triangle", frequency: midi(note + 5), detune: cents, decay: 0.2, peak: 0.1 * level });
  tone(engine, out, at + 0.055, { frequency: midi(note + 17), detune: cents, decay: 0.35, peak: 0.06 * level });
  tone(engine, out, at + 0.055, { frequency: midi(note + 5), detune: cents + 6, decay: 0.45, peak: 0.08 * level });
}

export function footstep(engine: AudioEngine, out: AudioNode, at: number, left: boolean): void {
  const p = vary(0.08);
  // Gravel crunch over a soft heel thump.
  noise(engine, out, at, { filter: "bandpass", frequency: (left ? 2200 : 2600) * p, q: 1.2, decay: 0.04, peak: 0.06 });
  noise(engine, out, at, { filter: "lowpass", frequency: (left ? 520 : 600) * p, decay: 0.06, peak: 0.12 });
  tone(engine, out, at, { frequency: (left ? 95 : 105) * p, glideTo: 60, decay: 0.05, peak: 0.1 });
}

export function jump(engine: AudioEngine, out: AudioNode, at: number, boots: boolean): void {
  const p = vary(0.05);
  // The push off: a scuff, then air rushing past, then a rising spring.
  noise(engine, out, at, { filter: "lowpass", frequency: 900, decay: 0.05, peak: 0.16 });
  noise(engine, out, at, { filter: "bandpass", frequency: 500 * p, sweepTo: 2600 * p, q: 1.4, decay: 0.24, peak: 0.2 });
  tone(engine, out, at, { frequency: (boots ? 260 : 330) * p, glideTo: (boots ? 1300 : 720) * p, decay: boots ? 0.4 : 0.18, peak: 0.1 });
  if (boots) {
    tone(engine, out, at, { type: "triangle", frequency: 520 * p, glideTo: 2080 * p, decay: 0.45, peak: 0.05 });
    noise(engine, out, at + 0.05, { filter: "highpass", frequency: 5000, sweepTo: 9000, decay: 0.4, peak: 0.06 });
  }
}

export function land(engine: AudioEngine, out: AudioNode, at: number, speed: number, roof: boolean): void {
  const hard = Math.min(1, speed / 14);
  const p = vary(0.06);
  noise(engine, out, at, { filter: "bandpass", frequency: roof ? 3200 : 2400, q: 1, decay: 0.05, peak: 0.08 + 0.08 * hard });
  noise(engine, out, at, { filter: "lowpass", frequency: (roof ? 1400 : 800) * p, decay: 0.14, peak: 0.16 + 0.18 * hard });
  tone(engine, out, at, { frequency: 120 * p, glideTo: 50, decay: 0.16, peak: 0.2 + 0.2 * hard });
  // Train roofs ring like metal underfoot.
  if (roof) {
    for (const f of [420, 663, 1011]) tone(engine, out, at, { type: "triangle", frequency: f * p, glideTo: f * p * 0.97, decay: 0.3, peak: 0.035 });
  }
}

/** Duck and roll: a low cloth rustle, a skid along the gravel, and air falling away. */
export function roll(engine: AudioEngine, out: AudioNode, at: number): void {
  const p = vary(0.06);
  noise(engine, out, at, { filter: "bandpass", frequency: 2400 * p, sweepTo: 300, q: 1.1, attack: 0.02, decay: 0.42, peak: 0.24 });
  noise(engine, out, at + 0.04, { filter: "lowpass", frequency: 1300 * p, attack: 0.03, decay: 0.35, peak: 0.12 });
  tone(engine, out, at, { frequency: 180 * p, glideTo: 70, decay: 0.2, peak: 0.12 });
}

/** A lane change: a swish that travels across the stereo field the way the runner went. */
export function lane(engine: AudioEngine, out: AudioNode, at: number, pan: number, dir: number): void {
  const p = vary(0.07);
  const side = travel(engine.ctx, out, at, pan - dir * 0.15, pan + dir * 0.35, 0.18);
  noise(engine, side, at, { filter: "bandpass", frequency: 800 * p, sweepTo: 3000 * p, q: 2, attack: 0.02, decay: 0.14, peak: 0.4 });
  noise(engine, side, at + 0.02, { filter: "highpass", frequency: 4000 * p, attack: 0.01, decay: 0.08, peak: 0.08 });
  tone(engine, side, at, { frequency: 220 * p, glideTo: 330 * p, decay: 0.08, peak: 0.04 });
}
