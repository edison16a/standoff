import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { human } from "./band";

/**
 * The locker room band for the menus: a warm string pad that swells and
 * hands each chord to the next, a muted flugelhorn, and a brushed kit.
 * Everything has a slow attack, so the lobby flows instead of ticking.
 */

/** A held level: swell in, hold, then let go over `release`. Starts silent so it never clicks. */
export function swell(param: AudioParam, at: number, attack: number, hold: number, release: number, peak: number): void {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.setValueAtTime(peak, at + Math.max(attack, hold));
  param.linearRampToValueAtTime(0, at + Math.max(attack, hold) + release);
}

/**
 * A string pad: two detuned saws per note through a low pass that opens
 * a little as the chord swells. The release overlaps the next chord, so
 * there is never a gap between bars.
 */
export function strings(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.3;
  filter.frequency.setValueAtTime(700, at);
  filter.frequency.linearRampToValueAtTime(1300, at + length * 0.5);
  filter.frequency.linearRampToValueAtTime(800, at + length);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.6, length, 0.9, peak);
  filter.connect(gain).connect(out);
  const end = at + length + 1;
  const oscs = notes.flatMap((note, i) =>
    [-7, 7].map((detune) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = midi(note);
      osc.detune.value = detune + (i % 2 ? 2 : -2);
      osc.connect(filter);
      osc.start(at);
      osc.stop(end);
      return osc;
    }),
  );
  const last = oscs[oscs.length - 1];
  if (last) last.onended = () => gain.disconnect();
}

/** A muted flugelhorn: a triangle and a sine through a dark filter, breathing in and out of each note. */
export function flugel(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(600, at);
  filter.frequency.linearRampToValueAtTime(1400, at + 0.12);
  filter.frequency.linearRampToValueAtTime(900, at + length);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  swell(gain.gain, at, 0.09, length * 0.8, length * 0.4 + 0.15, peak * human(0.08));
  filter.connect(gain).connect(out);
  // A slow vibrato that only arrives once the note has settled, like a player's.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.8;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(length > 0.6 ? 9 : 0, at + Math.min(0.5, length));
  lfo.connect(depth);
  const end = at + length * 1.2 + 0.3;
  for (const [type, detune] of [["triangle", 0], ["sawtooth", 4], ["sine", -3]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f * 0.99, at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.06);
    osc.detune.value = detune;
    depth.connect(osc.detune);
    const level = ctx.createGain();
    level.gain.value = type === "sawtooth" ? 0.25 : 1;
    osc.connect(level).connect(filter);
    osc.start(at);
    osc.stop(end);
  }
  lfo.start(at);
  lfo.stop(end);
  lfo.onended = () => gain.disconnect();
}

/** The brushed kit: a padded kick, a brush swish for the backbeat, and a soft sweep on the eighths. */
export const brushes = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 90, glideTo: 46, attack: 0.006, decay: 0.3, peak: peak * human(0.1) });
  },
  swish(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 2600, q: 0.7, attack: 0.03, decay: 0.2, peak: peak * human(0.15) });
  },
  sweep(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 5200, q: 0.9, attack: 0.04, decay: 0.09, peak: peak * human(0.3) });
  },
};
