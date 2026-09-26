import type { AudioEngine } from "@/platform/audio/audio-engine";
import { vary } from "./vary";
import { midi, noise, tone } from "./voices";

/**
 * The late night band for the menus: a warm synth pad that breathes
 * with a slow filter, an electric piano, a round bass, a soft gliding
 * lead and a padded kit. Every voice eases in, so the lobby drifts.
 */

/** A held level: swell in, hold, then let go over `release`. Starts silent so it never clicks. */
function swell(param: AudioParam, at: number, attack: number, hold: number, release: number, peak: number): void {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.setValueAtTime(peak, at + Math.max(attack, hold));
  param.linearRampToValueAtTime(0, at + Math.max(attack, hold) + release);
}

/**
 * The pad: detuned triangles and a quiet square an octave down, through
 * a filter a slow wobble opens and closes. Its release runs under the
 * next chord, so the bed never breaks between bars.
 */
export function pad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1100;
  filter.Q.value = 0.8;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.25;
  const depth = ctx.createGain();
  depth.gain.value = 450;
  lfo.connect(depth).connect(filter.frequency);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.7, length, 1.1, peak);
  filter.connect(gain).connect(out);
  const end = at + length + 1.2;
  for (const note of notes) {
    for (const [type, shift, detune, level] of [["triangle", 0, -8, 1], ["triangle", 0, 8, 1], ["square", -12, 0, 0.25]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = midi(note + shift);
      osc.detune.value = detune;
      const trim = ctx.createGain();
      trim.gain.value = level;
      osc.connect(trim).connect(filter);
      osc.start(at);
      osc.stop(end);
    }
  }
  lfo.start(at);
  lfo.stop(end);
  lfo.onended = () => gain.disconnect();
}

/** Electric piano: a sine with a quiet bell partial, the notes rolled so it sounds played. */
export function keys(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.018;
    tone(engine, out, t, { frequency: midi(note), attack: 0.012, decay: length, peak });
    tone(engine, out, t, { frequency: midi(note + 24), detune: 4, attack: 0.004, decay: length * 0.2, peak: peak * 0.15 });
  });
}

/** A round bass that leans into each note. */
export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f * 0.97, glideTo: f, attack: 0.02, decay: length, peak: peak * vary(0.05) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.02, decay: length * 0.5, peak: peak * 0.15 });
}

/** The lead: a soft sine and triangle that scoop up into the note and hold it with a slow vibrato. */
export function glide(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.06, length * 0.7, length * 0.5 + 0.2, peak * vary(0.06));
  gain.connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(12, at + Math.min(0.6, length));
  lfo.connect(depth);
  const end = at + length * 1.2 + 0.3;
  for (const [type, level] of [["sine", 1], ["triangle", 0.35]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f * 0.94, at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.09);
    depth.connect(osc.detune);
    const trim = ctx.createGain();
    trim.gain.value = level;
    osc.connect(trim).connect(gain);
    osc.start(at);
    osc.stop(end);
  }
  lfo.start(at);
  lfo.stop(end);
  lfo.onended = () => gain.disconnect();
}

/** The padded kit: a soft kick, a finger snap for the backbeat, and a shaker. */
export const softKit = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 100, glideTo: 45, attack: 0.005, decay: 0.28, peak: peak * vary(0.08) });
  },
  snap(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 2000, q: 1.6, attack: 0.002, decay: 0.07, peak: peak * vary(0.12) });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 6500, q: 1, attack: 0.015, decay: 0.05, peak: peak * vary(0.25) });
  },
};
