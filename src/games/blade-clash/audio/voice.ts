import type { AudioEngine } from "../../../platform/audio/audio-engine";

export interface HeldOptions {
  type?: OscillatorType;
  frequency: number;
  detune?: number;
  attack: number;
  /** How long the note holds at its peak before it fades. */
  hold: number;
  release: number;
  peak: number;
  /** A lowpass that opens on the attack and settles back, the way a horn brightens as it's blown. */
  filter?: { from: number; to: number; q?: number };
}

/**
 * A held note: an oscillator with an attack, a hold and a release, and
 * optionally a lowpass that opens as it sounds. The platform's `tone` only
 * rings down from its peak, which suits a pluck or a strike but not a horn
 * or a bowed string, which sustain. It stops and disconnects itself.
 */
export function held(engine: AudioEngine, out: AudioNode, at: number, options: HeldOptions): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  osc.type = options.type ?? "sawtooth";
  osc.frequency.setValueAtTime(options.frequency, at);
  if (options.detune) osc.detune.value = options.detune;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const end = at + options.attack + options.hold;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(options.peak, at + options.attack);
  gain.gain.setValueAtTime(options.peak, end);
  gain.gain.exponentialRampToValueAtTime(0.0001, end + options.release);
  let head: AudioNode = osc;
  if (options.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = options.filter.q ?? 0.8;
    filter.frequency.setValueAtTime(options.filter.from, at);
    filter.frequency.exponentialRampToValueAtTime(options.filter.to, at + options.attack + 0.02);
    filter.frequency.exponentialRampToValueAtTime(Math.max(options.filter.from, options.filter.to * 0.55), end + options.release);
    head = osc.connect(filter);
  }
  head.connect(gain).connect(out);
  osc.start(at);
  osc.stop(end + options.release + 0.05);
  osc.onended = () => gain.disconnect();
}
