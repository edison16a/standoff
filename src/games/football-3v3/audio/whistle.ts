import type { AudioEngine } from "@/platform/audio/audio-engine";
import { vary } from "./mix";

/** One blast: when it starts, how long it sounds, and how hard it is blown, 0 to 1. */
export interface Blast {
  at: number;
  length: number;
  force: number;
}

/**
 * How football officials blow. A play is whistled dead with one sharp
 * blast, a score or a turnover with a longer one, and the end of a
 * quarter with two short and one long.
 */
export const WHISTLES = {
  dead: [{ at: 0, length: 0.38, force: 0.85 }],
  score: [{ at: 0, length: 0.75, force: 1 }],
  quarter: [
    { at: 0, length: 0.22, force: 0.9 },
    { at: 0.34, length: 0.22, force: 0.9 },
    { at: 0.68, length: 1, force: 1 },
  ],
} satisfies Record<string, Blast[]>;

/**
 * A pealess whistle, the kind officials use in the pro game. It has no
 * cork ball, so there is no trill: three chambers each ring their own
 * note close to the others, and the notes beat against each other into
 * one piercing, slightly rough shriek. The pitch jumps up as the air
 * catches, rides a touch sharper the harder it is blown, and sags as the
 * breath runs out, with the hiss of the air underneath.
 */
export function pealessWhistle(engine: AudioEngine, dry: AudioNode, wet: AudioNode, start: number, blasts: readonly Blast[]): void {
  const { ctx } = engine;
  const base = vary(1, 0.02);
  for (const blast of blasts) {
    const at = start + blast.at;
    const end = at + blast.length;
    const sharp = 1 + 0.03 * blast.force;
    const out = ctx.createGain();
    const level = 0.13 * blast.force;
    out.gain.value = 0;
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(level, at + 0.015);
    out.gain.setValueAtTime(level, end - 0.05);
    out.gain.exponentialRampToValueAtTime(0.0001, end);
    out.connect(dry);
    out.connect(wet);
    const tones: OscillatorNode[] = [];
    for (const [f, amount] of [[2640, 0.9], [3080, 1], [3490, 0.7], [6160, 0.12]] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const pitch = f * base * sharp;
      osc.frequency.setValueAtTime(pitch * 0.9, at);
      osc.frequency.exponentialRampToValueAtTime(pitch, at + 0.03);
      osc.frequency.setValueAtTime(pitch, end - 0.08);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.96, end);
      const g = ctx.createGain();
      g.gain.value = amount;
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(end + 0.05);
      tones.push(osc);
    }
    breath(engine, out, at, end);
    tones[0]!.onended = () => out.disconnect();
  }
}

/** The air through the chambers: a hiss centred on the whistle's notes. */
function breath(engine: AudioEngine, out: AudioNode, at: number, end: number): void {
  const { ctx } = engine;
  const src = ctx.createBufferSource();
  src.buffer = engine.noiseBuffer();
  // The shared noise is two seconds long; a long blast from a random point would run off its end.
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3000;
  filter.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.value = 0.35;
  src.connect(filter).connect(g).connect(out);
  src.start(at, Math.random() * 1.5);
  src.stop(end + 0.05);
}
