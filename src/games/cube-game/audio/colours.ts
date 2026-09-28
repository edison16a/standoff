import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, noise, tone } from "@/platform/audio/voices";
import { hz } from "./notes";

/**
 * The sounds that give each level's band its own colour: a kick drum per
 * style, a chip lead for the circuit town and a growling bass for the
 * volcano. The shared voices live in `instruments.ts`.
 */

/** The drum kit's character. Soft for a lazy groove, punch for disco and trance, tight for electro, hard for the last level. */
export type Kit = "soft" | "punch" | "tight" | "hard";

const KICKS: Record<Kit, { from: number; to: number; decay: number; click: number }> = {
  soft: { from: 120, to: 45, decay: 0.34, click: 0.08 },
  punch: { from: 150, to: 42, decay: 0.28, click: 0.25 },
  tight: { from: 190, to: 50, decay: 0.16, click: 0.4 },
  hard: { from: 170, to: 38, decay: 0.32, click: 0.3 },
};

/** A kick drum in the kit's style: a falling sine for the thump and a tick of noise for the beater. */
export function kickFor(engine: AudioEngine, out: AudioNode, at: number, kit: Kit, peak = 0.8): void {
  const k = KICKS[kit];
  tone(engine, out, at, { type: "sine", frequency: k.from, glideTo: k.to, decay: k.decay, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: kit === "tight" ? 3200 : 1800, decay: 0.02, peak: peak * k.click });
}

/** A chip lead: one plain square with a quick vibrato, like an old game console, kept soft under a low pass. */
export function chip(engine: AudioEngine, out: AudioNode, at: number, midi: number, length: number, peak = 0.06): void {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = hz(midi);
  if (length > 0.2) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 7;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(18, at + 0.15);
    lfo.connect(depth).connect(osc.detune);
    lfo.start(at);
    lfo.stop(at + length + 0.1);
  }
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  // Short notes stay short, so a fast line stays crisp instead of smearing.
  envelope(gain.gain, at, 0.004, Math.max(0.08, length * 0.85), peak * 0.4);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.15);
  osc.onended = () => gain.disconnect();
}

/** A growling bass: a sine for weight under two saws a little apart, which beat against each other under a low pass. */
export function reese(engine: AudioEngine, out: AudioNode, at: number, midi: number, length: number): void {
  const { ctx } = engine;
  const f = hz(midi);
  tone(engine, out, at, { type: "sine", frequency: f, attack: 0.006, decay: length * 0.95, peak: 0.22 });
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "lowpass";
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(900, at);
  filter.frequency.exponentialRampToValueAtTime(260, at + Math.max(0.1, length));
  envelope(gain.gain, at, 0.008, length * 0.9, 0.07);
  filter.connect(gain).connect(out);
  const oscs = [-14, 14].map((detune) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + length + 0.05);
    return osc;
  });
  oscs[0]!.onended = () => gain.disconnect();
}
