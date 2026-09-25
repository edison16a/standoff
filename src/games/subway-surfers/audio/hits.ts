import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "./voices";
import { vary } from "./vary";

/**
 * The yard pushing back: trains, crashes, and the guard and his dog.
 */

/** A metallic clang and a grunt as the runner glances off a train. */
export function stumble(engine: AudioEngine, out: AudioNode, at: number): void {
  const p = vary(0.05);
  noise(engine, out, at, { filter: "highpass", frequency: 1800, decay: 0.15, peak: 0.28 });
  tone(engine, out, at, { frequency: 150 * p, glideTo: 60, decay: 0.15, peak: 0.25 });
  for (const f of [640, 1010, 1470]) tone(engine, out, at, { type: "triangle", frequency: f * p, decay: 0.4, peak: 0.055 });
  tone(engine, out, at + 0.04, { type: "sawtooth", frequency: 190 * p, glideTo: 120, decay: 0.16, peak: 0.05 });
}

/** The big one: a boom, bent metal, scattered debris and a slide whistle down. */
export function crash(engine: AudioEngine, out: AudioNode, at: number): void {
  const p = vary(0.04);
  noise(engine, out, at, { filter: "highpass", frequency: 2500, decay: 0.08, peak: 0.3 });
  tone(engine, out, at, { frequency: 160 * p, glideTo: 35, decay: 0.6, peak: 0.45 });
  noise(engine, out, at, { filter: "lowpass", frequency: 3000, sweepTo: 400, decay: 0.55, peak: 0.32 });
  for (const f of [520, 830, 1190, 1760]) tone(engine, out, at, { type: "triangle", frequency: f * p, glideTo: f * p * 0.94, decay: 0.9, peak: 0.045 });
  // Bits of the barrier landing after the hit.
  for (let i = 0; i < 4; i++) {
    noise(engine, out, at + 0.15 + Math.random() * 0.35, { filter: "bandpass", frequency: 1500 + Math.random() * 2500, q: 3, decay: 0.05, peak: 0.08 });
  }
  tone(engine, out, at + 0.25, { frequency: 1500, glideTo: 200, attack: 0.02, decay: 0.9, peak: 0.07 });
}

/** The hoverboard shatters and takes the hit: glass and a shimmer. */
export function saved(engine: AudioEngine, out: AudioNode, at: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 3500, decay: 0.3, peak: 0.35 });
  [2637, 3136, 3951, 4699].forEach((f, i) => tone(engine, out, at + i * 0.03, { frequency: f * vary(0.01), decay: 0.5, peak: 0.05 }));
  tone(engine, out, at, { frequency: 200, glideTo: 70, decay: 0.3, peak: 0.3 });
}

/** A chord on a train horn, dropping a little as it comes on, through a soft low pass. */
export function horn(engine: AudioEngine, out: AudioNode, at: number): void {
  const filter = engine.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.connect(out);
  const p = vary(0.02);
  for (const f of [311, 370, 466]) {
    tone(engine, filter, at, { type: "sawtooth", frequency: f * p, glideTo: f * p * 0.94, attack: 0.05, decay: 0.9, peak: 0.065 });
  }
  setTimeout(() => filter.disconnect(), (at - engine.now + 1.5) * 1000);
}

/** The rush of air from a train going by, with the clack of its wheels. */
export function passBy(engine: AudioEngine, out: AudioNode, at: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 400, sweepTo: 1600, q: 0.7, attack: 0.15, decay: 0.6, peak: 0.22 });
  for (let i = 0; i < 3; i++) noise(engine, out, at + 0.1 + i * 0.11, { filter: "bandpass", frequency: 1200 * vary(0.1), q: 4, decay: 0.03, peak: 0.07 });
}

/** The guard's whistle: a shrill trill with a breathy edge. */
export function whistle(engine: AudioEngine, out: AudioNode, at: number): void {
  const p = vary(0.02);
  for (let i = 0; i < 5; i++) tone(engine, out, at + i * 0.07, { frequency: (i % 2 ? 2750 : 2900) * p, decay: 0.08, peak: 0.1 });
  noise(engine, out, at, { filter: "bandpass", frequency: 2800, q: 4, attack: 0.01, decay: 0.35, peak: 0.05 });
}

/** The dog: two barks, each a growly voice through a vowel with a puff of breath. */
export function bark(engine: AudioEngine, out: AudioNode, at: number): void {
  const { ctx } = engine;
  for (const [i, delay] of [0, 0.22].entries()) {
    const t = at + delay;
    const base = (i === 0 ? 420 : 380) * vary(0.06);
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass";
    formant.frequency.value = 900;
    formant.Q.value = 2.5;
    formant.connect(out);
    tone(engine, formant, t, { type: "sawtooth", frequency: base, glideTo: base * 0.62, attack: 0.01, decay: 0.12, peak: 0.6 });
    noise(engine, out, t, { filter: "bandpass", frequency: 1400, q: 1, decay: 0.08, peak: 0.08 });
    setTimeout(() => formant.disconnect(), (t - engine.now + 0.6) * 1000);
  }
}
