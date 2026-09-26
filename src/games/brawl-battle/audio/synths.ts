import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi } from "@/platform/audio/voices";

/**
 * The pitched voices: leads that sustain for the whole note, an organ
 * for the lobby and a palm muted rhythm guitar for the battle. The
 * platform's `tone` only rings down from its peak, and a lead has to
 * hold, so these shape their own envelopes.
 */

export type LeadVoice = "guitar" | "saw" | "square" | "wide" | "mellow";

interface Layer {
  type: OscillatorType;
  detune: number;
  /** Octaves above the written note. */
  octave: number;
  level: number;
}

interface LeadShape {
  layers: Layer[];
  /** Low pass opens to the first value on the attack and settles to the second. */
  cutoff: [number, number];
  attack: number;
  drive: boolean;
  /** Evens out the voices, since a driven or square wave sounds louder than a saw at the same peak. */
  level: number;
}

const LEADS: Record<LeadVoice, LeadShape> = {
  guitar: { layers: [{ type: "sawtooth", detune: 0, octave: 0, level: 1 }, { type: "square", detune: 7, octave: -1, level: 0.4 }], cutoff: [2600, 1500], attack: 0.006, drive: true, level: 0.75 },
  saw: { layers: [{ type: "sawtooth", detune: -9, octave: 0, level: 0.7 }, { type: "sawtooth", detune: 9, octave: 0, level: 0.7 }], cutoff: [2800, 1400], attack: 0.01, drive: false, level: 1 },
  square: { layers: [{ type: "square", detune: 0, octave: 0, level: 0.8 }, { type: "triangle", detune: 5, octave: -1, level: 0.7 }], cutoff: [2300, 1300], attack: 0.008, drive: false, level: 0.8 },
  wide: { layers: [{ type: "sawtooth", detune: -14, octave: 0, level: 0.6 }, { type: "sawtooth", detune: 14, octave: 0, level: 0.6 }, { type: "triangle", detune: 0, octave: 1, level: 0.35 }], cutoff: [2500, 1300], attack: 0.012, drive: false, level: 1 },
  mellow: { layers: [{ type: "triangle", detune: 0, octave: 0, level: 1 }, { type: "sine", detune: 4, octave: -1, level: 0.5 }, { type: "sawtooth", detune: -6, octave: 0, level: 0.12 }], cutoff: [1500, 1000], attack: 0.07, drive: false, level: 1 },
};

let driveCurve: Float32Array<ArrayBuffer> | null = null;

/** A soft clipping curve, made once: it gives a guitar its growl without fizz. */
function drive(): Float32Array<ArrayBuffer> {
  if (driveCurve) return driveCurve;
  driveCurve = new Float32Array(1024);
  for (let i = 0; i < driveCurve.length; i++) {
    const x = (i / (driveCurve.length - 1)) * 2 - 1;
    driveCurve[i] = Math.tanh(x * 4) / Math.tanh(4);
  }
  return driveCurve;
}

/** A melody note that holds for `length` seconds, with vibrato easing in on longer notes. */
export function lead(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, voice: LeadVoice, peak: number): void {
  const { ctx } = engine;
  const shape = LEADS[voice];
  const end = at + Math.max(length, shape.attack + 0.02);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(500, at);
  filter.frequency.exponentialRampToValueAtTime(shape.cutoff[0], at + shape.attack + 0.02);
  filter.frequency.exponentialRampToValueAtTime(shape.cutoff[1], end + 0.1);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak * shape.level, at + shape.attack);
  gain.gain.setValueAtTime(peak * shape.level * 0.8, end);
  gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.14);
  let into: AudioNode = filter;
  if (shape.drive) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = drive();
    shaper.connect(filter);
    into = shaper;
  }
  filter.connect(gain).connect(out);
  const vibrato = length > 0.3 ? ctx.createOscillator() : null;
  const depth = ctx.createGain();
  if (vibrato) {
    vibrato.frequency.value = 5.4;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(14, at + 0.3);
    vibrato.connect(depth);
    vibrato.start(at);
    vibrato.stop(end + 0.2);
  }
  for (const layer of shape.layers) {
    const osc = ctx.createOscillator();
    osc.type = layer.type;
    const f = midi(note) * Math.pow(2, layer.octave);
    // A guitar note is bent up into pitch, which is most of what makes it sing.
    osc.frequency.setValueAtTime(shape.drive ? f * 0.97 : f, at);
    if (shape.drive) osc.frequency.exponentialRampToValueAtTime(f, at + 0.06);
    osc.detune.value = layer.detune;
    if (vibrato) depth.connect(osc.detune);
    const level = ctx.createGain();
    level.gain.value = layer.level;
    osc.connect(level).connect(into);
    osc.start(at);
    osc.stop(end + 0.2);
    osc.onended = () => level.disconnect();
  }
  setDisconnect(engine, gain, end + 0.3);
}

/** Lets a note's output go once it has rung out, so nodes never pile up. */
function setDisconnect(engine: AudioEngine, node: AudioNode, at: number): void {
  const source = engine.ctx.createConstantSource();
  source.offset.value = 0;
  source.start(at);
  source.stop(at + 0.01);
  source.onended = () => node.disconnect();
}

/** A drawbar organ chord that swells in and overlaps the next, so the lobby never has a gap. */
export function organ(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  const { ctx } = engine;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.35);
  gain.gain.setValueAtTime(peak, at + length);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 1.1);
  gain.connect(out);
  for (const note of notes) {
    for (const [ratio, level, detune] of [[1, 1, -4], [2, 0.45, 4], [3, 0.18, 0]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = midi(note) * ratio;
      osc.detune.value = detune;
      const layer = ctx.createGain();
      layer.gain.value = level;
      osc.connect(layer).connect(gain);
      osc.start(at);
      osc.stop(at + length + 1.2);
      osc.onended = () => layer.disconnect();
    }
  }
  setDisconnect(engine, gain, at + length + 1.3);
}

/** A palm muted power chord: root, fifth and octave through the drive, choked short. */
export function chug(engine: AudioEngine, out: AudioNode, at: number, root: number, peak: number): void {
  const { ctx } = engine;
  const shaper = ctx.createWaveShaper();
  shaper.curve = drive();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1500, at);
  filter.frequency.exponentialRampToValueAtTime(500, at + 0.12);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  shaper.connect(filter).connect(gain).connect(out);
  for (const offset of [0, 7, 12]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = midi(root + offset);
    const level = ctx.createGain();
    level.gain.value = 0.3;
    osc.connect(level).connect(shaper);
    osc.start(at);
    osc.stop(at + 0.2);
    osc.onended = () => level.disconnect();
  }
  setDisconnect(engine, gain, at + 0.25);
}
