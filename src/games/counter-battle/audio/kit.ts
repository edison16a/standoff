import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The drums and the bass: a tight kit with toms for the match and soft
 * rims and a shaker for the lobby. Sines and filtered noise carry it, so
 * it drives without ever sounding harsh.
 */

/** A small random spread around 1, so repeated hits never sound stamped out. */
function human(spread = 0.1): number {
  return 1 - spread / 2 + Math.random() * spread;
}

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 118, glideTo: 40, decay: 0.3, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 1300, decay: 0.012, peak: peak * 0.3 });
}

export function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  const p = peak * human();
  noise(engine, out, at, { filter: "bandpass", frequency: 1700, q: 0.8, decay: 0.17, peak: p });
  noise(engine, out, at + 0.008, { filter: "highpass", frequency: 3800, decay: 0.05, peak: p * 0.4 });
  tone(engine, out, at, { type: "triangle", frequency: 190, glideTo: 150, decay: 0.08, peak: p * 0.6 });
}

/** A side stick on the rim: a dry wooden click. */
export function rim(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 4, decay: 0.035, peak: peak * human() });
  tone(engine, out, at, { type: "triangle", frequency: 560, decay: 0.03, peak: peak * 0.4 });
}

export function hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 7800, decay: 0.025, peak: peak * human(0.3) });
}

export function shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 4800, q: 0.9, attack: 0.014, decay: 0.05, peak: peak * human(0.3) });
}

export function tom(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), glideTo: midi(note) * 0.72, decay: 0.26, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 800, decay: 0.05, peak: peak * 0.3 });
}

/** A swell of noise rising into the next section. */
export function riser(engine: AudioEngine, out: AudioNode, at: number, length: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 2400, q: 0.8, attack: length, decay: 0.08, peak });
}

export function crash(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: 4600, decay: 1.3, peak });
}

/** A deep sine bass that swells in and holds the bar, for the lobby. It never thumps, so the lobby stays calm. */
export function sub(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const { ctx } = engine;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.12);
  gain.gain.setValueAtTime(peak, at + length);
  // It fades over the next bar's swell, so the low end crossfades instead of dipping.
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.6);
  gain.connect(out);
  for (const [type, ratio, level] of [["sine", 1, 1], ["triangle", 2, 0.2]] as const) {
    const osc = ctx.createOscillator();
    const layer = ctx.createGain();
    osc.type = type;
    osc.frequency.value = midi(note) * ratio;
    layer.gain.value = level;
    osc.connect(layer).connect(gain);
    osc.start(at);
    osc.stop(at + length + 0.65);
    osc.onended = () => {
      layer.disconnect();
      gain.disconnect();
    };
  }
}
