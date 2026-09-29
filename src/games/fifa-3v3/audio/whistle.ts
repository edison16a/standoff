import type { AudioEngine } from "@/platform/audio/audio-engine";
import { vary } from "./mix";

/** One blast: how long it sounds and how hard it is blown, 0 to 1. */
export interface Blast {
  at: number;
  length: number;
  force: number;
}

/**
 * The patterns referees blow. A foul is a sharp pip then a long, hard
 * blast; a kick off one clean blast; full time two short and one long.
 */
export const WHISTLES = {
  kickoff: [{ at: 0, length: 0.42, force: 0.8 }],
  foul: [
    { at: 0, length: 0.11, force: 0.95 },
    { at: 0.17, length: 0.62, force: 1 },
  ],
  fulltime: [
    { at: 0, length: 0.3, force: 0.85 },
    { at: 0.45, length: 0.3, force: 0.85 },
    { at: 0.9, length: 1.15, force: 1 },
  ],
} satisfies Record<string, Blast[]>;

/**
 * A pea whistle, built the way the real one sounds. Breath across the
 * mouthpiece rings the chamber at about 2.8 kHz with a little second
 * harmonic. The cork pea spinning inside chops the air 25 to 35 times a
 * second, which gives the trill: the level and the pitch both flutter,
 * and not quite regularly because the pea never spins evenly. The pitch
 * scoops up as the blast starts and sags as the breath runs out, harder
 * blowing sits a touch sharper, and the air itself hisses underneath.
 */
export function peaWhistle(engine: AudioEngine, dry: AudioNode, wet: AudioNode, start: number, blasts: readonly Blast[]): void {
  const { ctx } = engine;
  const pitch = vary(2780, 0.025);
  for (const blast of blasts) {
    const at = start + blast.at;
    const end = at + blast.length;
    const f = pitch * (1 + 0.035 * blast.force);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(0.19 * blast.force, at + 0.012);
    out.gain.setValueAtTime(0.19 * blast.force, end - 0.045);
    out.gain.exponentialRampToValueAtTime(0.0001, end);
    out.connect(dry);
    out.connect(wet);
    // The pea: two slightly different flutters summed make the trill uneven.
    const trill = ctx.createGain();
    trill.gain.value = 0.62;
    trill.connect(out);
    const pea = [vary(29, 0.12), vary(23, 0.12)].map((rate, i) => {
      const lfo = ctx.createOscillator();
      lfo.type = i === 0 ? "sine" : "triangle";
      lfo.frequency.value = rate;
      const am = ctx.createGain();
      am.gain.value = i === 0 ? 0.28 : 0.12;
      lfo.connect(am).connect(trill.gain);
      return lfo;
    });
    const tones: OscillatorNode[] = [];
    for (const [ratio, level] of [[1, 1], [2, 0.12], [3, 0.03]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(f * ratio * 0.93, at);
      osc.frequency.exponentialRampToValueAtTime(f * ratio, at + 0.035);
      osc.frequency.setValueAtTime(f * ratio, end - 0.07);
      osc.frequency.exponentialRampToValueAtTime(f * ratio * 0.95, end);
      // The pea flutters the pitch too, by a hundred hertz or so.
      for (const [i, lfo] of pea.entries()) {
        const fm = ctx.createGain();
        fm.gain.value = (i === 0 ? 95 : 45) * ratio;
        lfo.connect(fm).connect(osc.frequency);
      }
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(trill);
      tones.push(osc);
    }
    breath(engine, out, at, end, f);
    for (const node of [...pea, ...tones]) {
      node.start(at);
      node.stop(end + 0.05);
    }
    tones[0]!.onended = () => out.disconnect();
  }
}

/** The air through the whistle: a hiss coloured by the chamber, and a softer wide one. */
function breath(engine: AudioEngine, out: AudioNode, at: number, end: number, f: number): void {
  const { ctx } = engine;
  for (const [type, freq, q, level] of [["bandpass", f, 9, 0.5], ["highpass", 5200, 0.7, 0.08]] as const) {
    const src = ctx.createBufferSource();
    src.buffer = engine.noiseBuffer();
    // The shared noise is two seconds long; a long blast from a random point would run off its end.
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(filter).connect(g).connect(out);
    src.start(at, Math.random() * 1.5);
    src.stop(end + 0.05);
  }
}
