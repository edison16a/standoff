import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, midi, type NoiseOptions, type ToneOptions } from "@/platform/audio/voices";

/**
 * The platform's tone and noise building blocks, with one change: each
 * gain starts at silence instead of the Web Audio default of full level.
 * A source that starts between two samples can leak its first sample
 * through before the envelope takes hold, and through a high pass that
 * single sample is a loud click. Starting silent removes it.
 */

export { midi };

export function tone(engine: AudioEngine, destination: AudioNode, at: number, options: ToneOptions): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(options.frequency, at);
  if (options.glideTo) osc.frequency.exponentialRampToValueAtTime(options.glideTo, at + options.decay);
  if (options.detune) osc.detune.value = options.detune;
  const attack = options.attack ?? 0.004;
  envelope(gain.gain, at, attack, options.decay, options.peak);
  osc.connect(gain).connect(destination);
  osc.start(at);
  osc.stop(at + attack + options.decay + 0.05);
  osc.onended = () => gain.disconnect();
}

export function noise(engine: AudioEngine, destination: AudioNode, at: number, options: NoiseOptions): void {
  const { ctx } = engine;
  const source = ctx.createBufferSource();
  source.buffer = engine.noiseBuffer();
  // Start somewhere random in the buffer so repeats do not sound identical.
  const offset = Math.random() * 1.5;
  const filter = ctx.createBiquadFilter();
  filter.type = options.filter;
  filter.frequency.value = options.frequency;
  filter.frequency.setValueAtTime(options.frequency, at);
  if (options.sweepTo) filter.frequency.exponentialRampToValueAtTime(options.sweepTo, at + options.decay);
  filter.Q.value = options.q ?? 1;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const attack = options.attack ?? 0.005;
  envelope(gain.gain, at, attack, options.decay, options.peak);
  source.connect(filter).connect(gain).connect(destination);
  source.start(at, offset, attack + options.decay + 0.05);
  source.onended = () => gain.disconnect();
}
