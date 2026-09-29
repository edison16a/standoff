import type { AudioEngine } from "@/platform/audio/audio-engine";
import { vary } from "./vary";
import { midi, noise, tone } from "./voices";

/**
 * The hip hop crew for the run: a punchy kick and snare, soft hats, a
 * round sub bass, a sunny marimba pluck for the hook, a whistled lead,
 * and a turntable for the scratches between sections. Every voice is
 * round rather than bright, so the beat sits under the effects and never
 * gets harsh at volume.
 */

/** A kick: a thump that drops fast from a punch into a sub, with a soft click on top so it reads on small speakers. */
export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(48, at + 0.07);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak * vary(0.04), at + 0.003);
  gain.gain.setTargetAtTime(0.0001, at + 0.05, 0.09);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.5);
  osc.onended = () => gain.disconnect();
  noise(engine, out, at, { filter: "lowpass", frequency: 2200, decay: 0.012, peak: peak * 0.12 });
}

/** A snare: a body that knocks, a crack of noise, and a light clap laid over it. */
export function snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  const level = peak * vary(0.08);
  tone(engine, out, at, { type: "triangle", frequency: 200, glideTo: 150, attack: 0.001, decay: 0.09, peak: level * 1.3 });
  noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 0.8, attack: 0.001, decay: 0.16, peak: level });
  for (const offset of [0.008, 0.019]) noise(engine, out, at + offset, { filter: "bandpass", frequency: 1300, q: 1.4, attack: 0.001, decay: 0.03, peak: level * 0.5 });
}

/** A hat: closed is a tick, open rings a little. Band passed, so it shimmers without hiss. */
export function hat(engine: AudioEngine, out: AudioNode, at: number, open: boolean, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: open ? 7800 : 9000, q: 0.9, attack: 0.001, decay: open ? 0.2 : 0.035, peak: peak * vary(0.15) });
}

/** The sub bass: a sine that leans up into the note, with a quiet octave so it carries on laptop speakers. */
export function sub(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f * 0.94, glideTo: f, attack: 0.008, decay: length, peak: peak * vary(0.04) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.008, decay: length * 0.6, peak: peak * 0.18 });
}

/** A marimba pluck: a warm tone and its octave, with a woody knock high above them that dies at once. */
export function pluck(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  const level = peak * vary(0.08);
  tone(engine, out, at, { frequency: f, attack: 0.003, decay: 0.42, peak: level });
  tone(engine, out, at, { type: "triangle", frequency: f, attack: 0.002, decay: 0.15, peak: level * 0.5 });
  tone(engine, out, at, { frequency: f * 2, attack: 0.002, decay: 0.2, peak: level * 0.3 });
  tone(engine, out, at, { frequency: f * 3.93, attack: 0.001, decay: 0.06, peak: level * 0.35 });
}

/** The whistled lead: a pure tone that slides up into the note and sings with a gentle vibrato, and a breath of air. */
export function whistle(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.04);
  gain.gain.setValueAtTime(peak, at + Math.max(0.05, length - 0.06));
  gain.gain.linearRampToValueAtTime(0, at + length + 0.08);
  gain.connect(out);
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(f * 0.96, at);
  osc.frequency.exponentialRampToValueAtTime(f, at + 0.06);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.6;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(14, at + Math.min(0.4, length));
  lfo.connect(depth).connect(osc.detune);
  osc.connect(gain);
  const end = at + length + 0.15;
  for (const node of [osc, lfo]) {
    node.start(at);
    node.stop(end);
  }
  osc.onended = () => gain.disconnect();
  noise(engine, out, at, { filter: "bandpass", frequency: f, q: 6, attack: 0.03, decay: length * 0.8, peak: peak * 0.25 });
}

/** A record scratched back and forth: a narrow band of noise sweeping up and down, chopped at each turn. */
export function scratch(engine: AudioEngine, out: AudioNode, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const source = ctx.createBufferSource();
  source.buffer = engine.noiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 5;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const strokes = [700, 2600, 550, 2900, 800];
  filter.frequency.setValueAtTime(strokes[0]!, at);
  gain.gain.setValueAtTime(0, at);
  strokes.slice(1).forEach((f, i) => {
    const t = at + ((i + 1) / (strokes.length - 1)) * length;
    const mid = at + ((i + 0.5) / (strokes.length - 1)) * length;
    filter.frequency.exponentialRampToValueAtTime(f, t);
    gain.gain.linearRampToValueAtTime(peak, mid);
    gain.gain.linearRampToValueAtTime(peak * 0.15, t);
  });
  gain.gain.linearRampToValueAtTime(0, at + length + 0.03);
  source.connect(filter).connect(gain).connect(out);
  source.start(at, Math.random(), length + 0.1);
  source.onended = () => gain.disconnect();
}

/** A soft rush up into the next section. */
export function riser(engine: AudioEngine, out: AudioNode, at: number, length: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 500, sweepTo: 5000, q: 1.2, attack: length * 0.9, decay: 0.08, peak });
}
