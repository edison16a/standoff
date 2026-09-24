import type { AudioEngine } from "./audio-engine";

/**
 * Tiny building blocks the sound effects and music are assembled from.
 * Each schedules its nodes at an exact audio clock time and lets them
 * stop and disconnect on their own, so nothing leaks between rounds.
 */

export interface ToneOptions {
  type?: OscillatorType;
  frequency: number;
  /** Optional glide target, reached at the end of the note. */
  glideTo?: number;
  attack?: number;
  decay: number;
  peak: number;
  detune?: number;
}

/** One oscillator with a percussive attack and exponential decay. */
export function tone(engine: AudioEngine, destination: AudioNode, at: number, options: ToneOptions): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(options.frequency, at);
  if (options.glideTo) osc.frequency.exponentialRampToValueAtTime(options.glideTo, at + options.decay);
  if (options.detune) osc.detune.value = options.detune;
  envelope(gain.gain, at, options.attack ?? 0.004, options.decay, options.peak);
  osc.connect(gain).connect(destination);
  osc.start(at);
  osc.stop(at + (options.attack ?? 0.004) + options.decay + 0.05);
  osc.onended = () => gain.disconnect();
}

export interface NoiseOptions {
  filter: BiquadFilterType;
  frequency: number;
  /** Optional filter sweep target, reached at the end. */
  sweepTo?: number;
  q?: number;
  attack?: number;
  decay: number;
  peak: number;
}

/** A burst of filtered noise: whooshes, impacts, crowd voices, hats. */
export function noise(engine: AudioEngine, destination: AudioNode, at: number, options: NoiseOptions): void {
  const { ctx } = engine;
  const source = ctx.createBufferSource();
  source.buffer = engine.noiseBuffer();
  // Start somewhere random in the buffer so repeats do not sound identical.
  const offset = Math.random() * 1.5;
  const filter = ctx.createBiquadFilter();
  filter.type = options.filter;
  filter.frequency.setValueAtTime(options.frequency, at);
  if (options.sweepTo) filter.frequency.exponentialRampToValueAtTime(options.sweepTo, at + options.decay);
  filter.Q.value = options.q ?? 1;
  const gain = ctx.createGain();
  const attack = options.attack ?? 0.005;
  envelope(gain.gain, at, attack, options.decay, options.peak);
  source.connect(filter).connect(gain).connect(destination);
  source.start(at, offset, attack + options.decay + 0.05);
  source.onended = () => gain.disconnect();
}

/** Linear attack to the peak, then an exponential fall to silence. */
export function envelope(param: AudioParam, at: number, attack: number, decay: number, peak: number): void {
  param.cancelScheduledValues(at);
  param.setValueAtTime(0.0001, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

/** Equal tempered pitch from a MIDI note number. */
export function midi(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}
