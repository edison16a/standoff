import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

/**
 * The building blocks of the arena's own sounds. Everything is short and
 * built from tones, with noise only in the few milliseconds of a clap,
 * so nothing ever hisses or sounds like wind.
 */

export interface HeldOptions {
  type: OscillatorType;
  frequency: number;
  /** Seconds at full level, between the attack and the release. */
  hold: number;
  peak: number;
  attack?: number;
  release?: number;
  detune?: number;
}

/**
 * A sustained note: up, flat, then down. Horns and buzzers need a steady
 * level, which the percussive `tone` cannot give.
 */
export function held(engine: AudioEngine, out: AudioNode, at: number, o: HeldOptions): void {
  const { ctx } = engine;
  const attack = o.attack ?? 0.012;
  const release = o.release ?? 0.08;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.frequency, at);
  if (o.detune) osc.detune.value = o.detune;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(o.peak, at + attack);
  gain.gain.setValueAtTime(o.peak, at + attack + o.hold);
  gain.gain.linearRampToValueAtTime(0, at + attack + o.hold + release);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + attack + o.hold + release + 0.02);
  osc.onended = () => gain.disconnect();
}

/**
 * A stomp on the bleachers: a deep sine dropping fast, a sub under it
 * and a tiny tonal click on top so it cuts through on small speakers.
 */
export function stompKick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 165, glideTo: 46, decay: 0.3, peak });
  tone(engine, out, at, { frequency: 58, decay: 0.22, peak: peak * 0.45 });
  tone(engine, out, at, { type: "triangle", frequency: 1400, glideTo: 240, decay: 0.014, peak: peak * 0.18 });
}

/**
 * Thousands of hands at once, done the drum machine way: three quick
 * bursts a hair apart for the smack, then a short body. All of it is
 * gone in a tenth of a second.
 */
export function handClap(engine: AudioEngine, out: AudioNode, wet: AudioNode, at: number, peak: number): void {
  for (let i = 0; i < 3; i++) {
    noise(engine, out, at + i * 0.011, { filter: "bandpass", frequency: 1450, q: 1.4, attack: 0.001, decay: 0.012, peak: peak * 0.8 });
  }
  noise(engine, out, at + 0.033, { filter: "bandpass", frequency: 1250, q: 1.1, attack: 0.002, decay: 0.09, peak });
  tone(engine, out, at, { type: "triangle", frequency: 240, glideTo: 180, decay: 0.04, peak: peak * 0.25 });
  noise(engine, wet, at + 0.033, { filter: "bandpass", frequency: 1300, q: 1.2, decay: 0.1, peak: peak * 0.45 });
}
