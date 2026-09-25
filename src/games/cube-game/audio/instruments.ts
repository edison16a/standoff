import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, noise, tone } from "@/platform/audio/voices";
import { hz } from "./notes";

/**
 * The band every song is played by. Each voice books its nodes at an exact
 * time on the audio clock and cleans up after itself. Levels are only
 * the notes, so all five songs share one warm, consistent sound.
 */

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak = 0.8): void {
  tone(engine, out, at, { type: "sine", frequency: 150, glideTo: 42, decay: 0.28, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 1800, decay: 0.02, peak: peak * 0.25 });
}

/** A small random spread around 1, so repeated hits never sound stamped out. */
export function human(spread = 0.12): number {
  return 1 - spread / 2 + Math.random() * spread;
}

/** A snare in two layers: the rattle of the wires over the body of the drum. */
export function snare(engine: AudioEngine, out: AudioNode, at: number, peak = 0.3): void {
  const p = peak * human(0.1);
  noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 0.7, decay: 0.18, peak: p });
  noise(engine, out, at, { filter: "lowpass", frequency: 3500, decay: 0.06, peak: p * 0.4 });
  tone(engine, out, at, { type: "triangle", frequency: 210, glideTo: 150, decay: 0.08, peak: p * 0.8 });
}

/** A clap: three quick bursts of noise, the way a room smears hands together. */
export function clap(engine: AudioEngine, out: AudioNode, at: number, peak = 0.28): void {
  for (const [i, delay] of [0, 0.011, 0.022].entries()) {
    noise(engine, out, at + delay, { filter: "bandpass", frequency: 1300, q: 1.2, decay: i === 2 ? 0.16 : 0.02, peak });
  }
}

export function hat(engine: AudioEngine, out: AudioNode, at: number, open = false, peak = 0.07): void {
  noise(engine, out, at, { filter: "highpass", frequency: 8000, decay: open ? 0.22 : 0.035, peak: peak * human(0.35) });
}

export type BassStyle = "round" | "saw" | "pluck";

/** Bass: a sine for weight, and for the brighter styles a filtered saw on top that closes as it decays. */
export function bass(engine: AudioEngine, out: AudioNode, at: number, midi: number, length: number, style: BassStyle = "round"): void {
  const { ctx } = engine;
  const f = hz(midi);
  tone(engine, out, at, { type: "sine", frequency: f, attack: 0.006, decay: length * 0.95, peak: 0.34 });
  if (style === "round") return;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = f;
  filter.type = "lowpass";
  filter.Q.value = style === "pluck" ? 6 : 2;
  filter.frequency.setValueAtTime(style === "pluck" ? 2400 : 1200, at);
  filter.frequency.exponentialRampToValueAtTime(180, at + Math.min(length, 0.35));
  envelope(gain.gain, at, 0.005, length * 0.9, 0.11);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
  osc.onended = () => gain.disconnect();
}

/** A short bright note for arpeggios. */
export function pluck(engine: AudioEngine, out: AudioNode, at: number, midi: number, peak = 0.05, type: OscillatorType = "square"): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = hz(midi);
  filter.type = "lowpass";
  // Opens bright and closes fast: a pluck with no fizz left on its tail.
  filter.frequency.setValueAtTime(3600, at);
  filter.frequency.exponentialRampToValueAtTime(500, at + 0.2);
  envelope(gain.gain, at, 0.003, 0.22, peak);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.3);
  osc.onended = () => gain.disconnect();
}

/** A soft chord: two slightly detuned saws per note under a gentle filter, fading in and out slowly. */
export function pad(engine: AudioEngine, out: AudioNode, at: number, midis: readonly number[], length: number, peak = 0.022): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + Math.min(0.4, length / 3));
  gain.gain.setValueAtTime(peak, at + length * 0.75);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.3);
  filter.connect(gain).connect(out);
  const oscs = midis.flatMap((midi) =>
    [-9, 9].map((detune) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = hz(midi);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.4);
      return osc;
    }),
  );
  oscs[0]!.onended = () => gain.disconnect();
}

export type LeadVoice = "bell" | "square" | "saw" | "glass";

/** The tune on top. Longer notes get a little vibrato, which is most of what makes a synth lead sing. */
export function lead(engine: AudioEngine, out: AudioNode, at: number, midi: number, length: number, voice: LeadVoice, peak = 0.06): void {
  const { ctx } = engine;
  const f = hz(midi);
  if (voice === "bell" || voice === "glass") {
    tone(engine, out, at, { type: "sine", frequency: f, decay: Math.max(0.4, length * 1.2), peak: peak * 1.4 });
    tone(engine, out, at, { type: voice === "bell" ? "sine" : "triangle", frequency: f * (voice === "bell" ? 3 : 2), decay: 0.25, peak: peak * 0.45 });
    return;
  }
  // Two oscillators a few cents apart: the slow beating between them is what makes a synth lead sound wide and warm.
  const oscs = [-6, 6].map((detune) => {
    const osc = ctx.createOscillator();
    osc.type = voice === "square" ? "square" : "sawtooth";
    osc.frequency.value = f;
    osc.detune.value = detune;
    return osc;
  });
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  if (length > 0.3) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(f * 0.012, at + 0.35);
    lfo.connect(depth);
    for (const osc of oscs) depth.connect(osc.frequency);
    lfo.start(at);
    lfo.stop(at + length + 0.1);
  }
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(voice === "square" ? 2200 : 2600, at);
  filter.frequency.exponentialRampToValueAtTime(voice === "square" ? 1300 : 1600, at + Math.max(0.1, length));
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak * 0.5, at + 0.01);
  gain.gain.setValueAtTime(peak * 0.5, at + Math.max(0.02, length - 0.04));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.12);
  filter.connect(gain).connect(out);
  for (const osc of oscs) {
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + length + 0.2);
  }
  oscs[0]!.onended = () => gain.disconnect();
}
