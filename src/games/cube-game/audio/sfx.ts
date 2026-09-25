import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { cheer } from "./cheer";
import { human } from "./instruments";

/** A soft clipping curve, which gives the death crunch its grit. */
function crunchCurve(amount: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}

/**
 * Every sound effect, synthesised, through the platform's effects bus so
 * the volume setting controls them. Each is short and pitched to sit in
 * key with the music rather than fight it.
 */
export class Sfx {
  private readonly out: GainNode;
  private readonly grit: WaveShaperNode;

  constructor(private readonly engine: AudioEngine) {
    const { ctx } = engine;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(engine.bus("sfx"));
    this.grit = ctx.createWaveShaper();
    this.grit.curve = crunchCurve(6);
    // The shaper squares its input off near full scale, so its output is turned well down.
    const gritLevel = ctx.createGain();
    gritLevel.gain.value = 0.3;
    this.grit.connect(gritLevel).connect(this.out);
  }

  private get now(): number {
    return this.engine.now + 0.005;
  }

  /** A quiet upward blip with a puff of air, so the player hears the jump land in time. */
  jump(): void {
    const r = human(0.08);
    tone(this.engine, this.out, this.now, { type: "square", frequency: 330 * r, glideTo: 660 * r, decay: 0.07, peak: 0.05 });
    tone(this.engine, this.out, this.now, { type: "sine", frequency: 520 * r, glideTo: 1040 * r, decay: 0.09, peak: 0.14 });
    noise(this.engine, this.out, this.now, { filter: "bandpass", frequency: 1500 * r, sweepTo: 3500, q: 1.2, decay: 0.06, peak: 0.06 });
  }

  flap(): void {
    const r = human(0.12);
    noise(this.engine, this.out, this.now, { filter: "bandpass", frequency: 700 * r, sweepTo: 2200 * r, q: 1.5, decay: 0.14, peak: 0.3 });
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: 440 * r, glideTo: 740 * r, decay: 0.1, peak: 0.1 });
  }

  /** Gravity flipping: a swoop the way the ball goes, with a soft thump as it lets go. */
  flip(up: boolean): void {
    const r = human(0.08);
    tone(this.engine, this.out, this.now, { type: "sine", frequency: (up ? 380 : 900) * r, glideTo: (up ? 900 : 380) * r, decay: 0.14, peak: 0.18 });
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: (up ? 760 : 1800) * r, glideTo: (up ? 1800 : 760) * r, decay: 0.1, peak: 0.04 });
    tone(this.engine, this.out, this.now, { frequency: 120, glideTo: 70, decay: 0.08, peak: 0.12 });
  }

  /** The crash: a gritty burst, a falling thump and a scatter of noise. */
  death(): void {
    const at = this.now;
    noise(this.engine, this.grit, at, { filter: "lowpass", frequency: 4000, sweepTo: 180, q: 0.8, decay: 0.45, peak: 0.3 });
    tone(this.engine, this.grit, at, { type: "square", frequency: 180, glideTo: 40, decay: 0.3, peak: 0.12 });
    tone(this.engine, this.out, at, { type: "sine", frequency: 110, glideTo: 35, decay: 0.4, peak: 0.35 });
    noise(this.engine, this.out, at + 0.04, { filter: "highpass", frequency: 3000, decay: 0.25, peak: 0.08 });
    // Shards of the cube: a scatter of tiny glassy ticks falling in pitch.
    for (let i = 0; i < 6; i++) {
      const f = 2400 + Math.random() * 2400;
      tone(this.engine, this.out, at + 0.03 + i * 0.035 + Math.random() * 0.02, { type: "triangle", frequency: f, glideTo: f * 0.8, decay: 0.06, peak: 0.03 });
    }
  }

  portal(): void {
    const at = this.now;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 400, sweepTo: 5000, q: 2, attack: 0.05, decay: 0.45, peak: 0.4 });
    [72, 76, 79, 84].forEach((n, i) => tone(this.engine, this.out, at + i * 0.04, { type: "sine", frequency: midi(n), decay: 0.3, peak: 0.08 }));
  }

  speed(faster: boolean): void {
    noise(this.engine, this.out, this.now, { filter: "bandpass", frequency: faster ? 800 : 3000, sweepTo: faster ? 4000 : 600, q: 3, decay: 0.35, peak: 0.5 });
  }

  /** A spring: a boing up the octave with a springy thump under it. */
  pad(): void {
    const r = human(0.08);
    tone(this.engine, this.out, this.now, { type: "sine", frequency: 220 * r, glideTo: 880 * r, decay: 0.22, peak: 0.25 });
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: 440 * r, glideTo: 1320 * r, decay: 0.16, peak: 0.08 });
    tone(this.engine, this.out, this.now, { frequency: 150, glideTo: 60, decay: 0.1, peak: 0.16 });
  }

  /** An orb: a bright bell pair with a sparkle, a random note of the pentatonic so a chain of them sings. */
  orb(): void {
    const note = [84, 86, 88, 91, 93][Math.floor(Math.random() * 5)]!;
    tone(this.engine, this.out, this.now, { type: "sine", frequency: midi(note + 4), decay: 0.3, peak: 0.18 });
    tone(this.engine, this.out, this.now, { type: "sine", frequency: midi(note + 11), decay: 0.22, peak: 0.1 });
    noise(this.engine, this.out, this.now, { filter: "highpass", frequency: 7000, decay: 0.12, peak: 0.08 });
  }

  checkpoint(): void {
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: midi(79), decay: 0.25, peak: 0.06 });
    tone(this.engine, this.out, this.now + 0.07, { type: "triangle", frequency: midi(86), decay: 0.3, peak: 0.06 });
  }

  /** The level is done: a bright run up into a held chord and a cymbal. */
  fanfare(): void {
    const at = this.now + 0.02;
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => {
      tone(this.engine, this.out, at + i * 0.07, { type: "square", frequency: midi(n), decay: 0.2, peak: 0.05 });
      tone(this.engine, this.out, at + i * 0.07, { type: "triangle", frequency: midi(n + 12), decay: 0.24, peak: 0.04 });
    });
    const held = at + 0.55;
    for (const n of [72, 76, 79, 84]) tone(this.engine, this.out, held, { type: "sawtooth", frequency: midi(n), attack: 0.02, decay: 2.2, peak: 0.035 });
    tone(this.engine, this.out, held, { type: "sine", frequency: midi(48), decay: 2.4, peak: 0.3 });
    noise(this.engine, this.out, held, { filter: "highpass", frequency: 6000, decay: 1.6, peak: 0.14 });
    cheer(this.engine, 1, 0.5);
  }

  /** A new best: a quick glittering run and a sparkle on top. */
  newBest(): void {
    [79, 83, 86, 91, 95].forEach((n, i) => {
      tone(this.engine, this.out, this.now + i * 0.06, { type: "sine", frequency: midi(n), decay: 0.3, peak: 0.07 });
      tone(this.engine, this.out, this.now + i * 0.06, { type: "triangle", frequency: midi(n + 12), decay: 0.12, peak: 0.02 });
    });
    noise(this.engine, this.out, this.now + 0.2, { filter: "highpass", frequency: 8000, attack: 0.02, decay: 0.5, peak: 0.05 });
  }

  /** Menus: a soft tick on hover, a chime on choosing, a lower one going back. */
  hover(): void {
    tone(this.engine, this.out, this.now, { type: "sine", frequency: 1200, decay: 0.04, peak: 0.03 });
  }

  select(): void {
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: midi(76), decay: 0.12, peak: 0.1 });
    tone(this.engine, this.out, this.now + 0.06, { type: "triangle", frequency: midi(83), decay: 0.2, peak: 0.1 });
  }

  back(): void {
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: midi(76), decay: 0.1, peak: 0.06 });
    tone(this.engine, this.out, this.now + 0.06, { type: "triangle", frequency: midi(69), decay: 0.16, peak: 0.06 });
  }

  /** Starting a level: a rising whoosh into a bright chord. */
  start(): void {
    const at = this.now;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 300, sweepTo: 6000, q: 1.2, attack: 0.15, decay: 0.3, peak: 0.16 });
    for (const n of [72, 76, 79]) tone(this.engine, this.out, at + 0.3, { type: "triangle", frequency: midi(n), decay: 0.5, peak: 0.05 });
  }

  /** A tick for each player who finishes calibrating or passes the jump check. */
  tick(high = false): void {
    tone(this.engine, this.out, this.now, { type: "sine", frequency: high ? 1320 : 880, decay: 0.1, peak: 0.08 });
  }

  dispose(): void {
    setTimeout(() => this.out.disconnect(), 3000);
  }
}
