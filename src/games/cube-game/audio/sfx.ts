import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

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

  /** A quiet upward blip, so the player hears the jump land in time. */
  jump(): void {
    tone(this.engine, this.out, this.now, { type: "square", frequency: 330, glideTo: 660, decay: 0.07, peak: 0.07 });
    tone(this.engine, this.out, this.now, { type: "sine", frequency: 520, glideTo: 1040, decay: 0.09, peak: 0.14 });
  }

  flap(): void {
    noise(this.engine, this.out, this.now, { filter: "bandpass", frequency: 700, sweepTo: 2200, q: 1.5, decay: 0.14, peak: 0.3 });
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: 440, glideTo: 740, decay: 0.1, peak: 0.1 });
  }

  flip(up: boolean): void {
    tone(this.engine, this.out, this.now, { type: "sine", frequency: up ? 380 : 900, glideTo: up ? 900 : 380, decay: 0.14, peak: 0.18 });
  }

  /** The crash: a gritty burst, a falling thump and a scatter of noise. */
  death(): void {
    const at = this.now;
    noise(this.engine, this.grit, at, { filter: "lowpass", frequency: 4000, sweepTo: 180, q: 0.8, decay: 0.45, peak: 0.3 });
    tone(this.engine, this.grit, at, { type: "square", frequency: 180, glideTo: 40, decay: 0.3, peak: 0.12 });
    tone(this.engine, this.out, at, { type: "sine", frequency: 110, glideTo: 35, decay: 0.4, peak: 0.35 });
    noise(this.engine, this.out, at + 0.04, { filter: "highpass", frequency: 3000, decay: 0.25, peak: 0.08 });
  }

  portal(): void {
    const at = this.now;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 400, sweepTo: 5000, q: 2, attack: 0.05, decay: 0.45, peak: 0.4 });
    [72, 76, 79, 84].forEach((n, i) => tone(this.engine, this.out, at + i * 0.04, { type: "sine", frequency: midi(n), decay: 0.3, peak: 0.08 }));
  }

  speed(faster: boolean): void {
    noise(this.engine, this.out, this.now, { filter: "bandpass", frequency: faster ? 800 : 3000, sweepTo: faster ? 4000 : 600, q: 3, decay: 0.35, peak: 0.5 });
  }

  pad(): void {
    tone(this.engine, this.out, this.now, { type: "sine", frequency: 220, glideTo: 880, decay: 0.22, peak: 0.25 });
    tone(this.engine, this.out, this.now, { type: "triangle", frequency: 440, glideTo: 1320, decay: 0.16, peak: 0.08 });
  }

  orb(): void {
    tone(this.engine, this.out, this.now, { type: "sine", frequency: midi(88), decay: 0.3, peak: 0.18 });
    tone(this.engine, this.out, this.now, { type: "sine", frequency: midi(95), decay: 0.22, peak: 0.1 });
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
  }

  newBest(): void {
    [79, 83, 86, 91].forEach((n, i) => tone(this.engine, this.out, this.now + i * 0.06, { type: "sine", frequency: midi(n), decay: 0.25, peak: 0.07 }));
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
