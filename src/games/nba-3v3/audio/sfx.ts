import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The court's own sounds, synthesised: the ball on the hardwood, sneakers
 * squeaking, the net, the iron and the glass, passes and blocks, and the
 * horns. Each fires straight off the event that also moves the picture.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get at(): number {
    return this.engine.now + 0.004;
  }

  /** The ball hitting the floor: a hollow thump with a little ring of the leather. */
  bounce(power: number, level = 1): void {
    const p = Math.min(1, power) * level;
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 120, glideTo: 58, decay: 0.1, peak: 0.55 * p });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 1100, decay: 0.05, peak: 0.3 * p });
    tone(this.engine, this.out, this.at, { type: "triangle", frequency: 420, decay: 0.05, peak: 0.05 * p });
  }

  squeak(level = 1): void {
    const f = 2300 + Math.random() * 900;
    tone(this.engine, this.out, this.at, { type: "sine", frequency: f, glideTo: f * 1.25, attack: 0.01, decay: 0.12, peak: 0.07 * level });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: f, q: 9, decay: 0.1, peak: 0.12 * level });
  }

  /** Nothing but net, or the softer rattle of a ball that touched iron on the way. */
  net(swish: boolean): void {
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 2600, sweepTo: 7000, attack: 0.01, decay: swish ? 0.32 : 0.2, peak: swish ? 0.5 : 0.3 });
    noise(this.engine, this.out, this.at + 0.03, { filter: "bandpass", frequency: 4800, q: 1.5, decay: 0.14, peak: 0.2 });
  }

  /** The iron: a clank of inharmonic metal partials, louder and longer the harder it is hit. */
  rim(power: number): void {
    const p = 0.35 + Math.min(1, power) * 0.65;
    [476, 1187, 1793, 2689, 3910].forEach((f, i) => tone(this.engine, this.out, this.at, { type: "sine", frequency: f * (0.98 + Math.random() * 0.04), decay: 0.25 + 0.5 / (i + 1), peak: (0.16 / (i * 0.6 + 1)) * p }));
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 2500, decay: 0.03, peak: 0.35 * p });
  }

  /** The glass: a deep thud and a short shiver of the board. */
  board(power: number): void {
    const p = 0.4 + Math.min(1, power) * 0.6;
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 95, glideTo: 60, decay: 0.2, peak: 0.6 * p });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 1500, decay: 0.12, peak: 0.35 * p });
    tone(this.engine, this.out, this.at + 0.01, { type: "triangle", frequency: 1850, decay: 0.2, peak: 0.03 * p });
  }

  /** A dunk: the rim bent down hard, the whole stanchion shuddering, a low boom under it. */
  slam(power: number): void {
    this.rim(1);
    this.board(0.8);
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 70, glideTo: 38, decay: 0.55, peak: 0.7 * power });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 400, decay: 0.4, peak: 0.4 * power });
  }

  pass(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 600, sweepTo: 1900, q: 1.4, attack: 0.02, decay: 0.14, peak: 0.16 });
  }

  catch(): void {
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 1300, decay: 0.05, peak: 0.35 });
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 180, glideTo: 110, decay: 0.06, peak: 0.2 });
  }

  /** A hand on the ball: the slap of a block or a swipe. */
  slap(power = 1): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 1600, q: 0.8, decay: 0.08, peak: 0.6 * power });
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 220, glideTo: 120, decay: 0.08, peak: 0.3 * power });
  }

  whoosh(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 400, sweepTo: 1400, q: 1.2, attack: 0.03, decay: 0.2, peak: 0.12 });
  }

  /** The jump off the floor, a soft grunt of effort from the shoes. */
  takeoff(): void {
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 700, decay: 0.08, peak: 0.25 });
  }

  land(hard: boolean): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 90, glideTo: 50, decay: hard ? 0.2 : 0.1, peak: hard ? 0.5 : 0.25 });
    if (hard) this.squeak(0.8);
  }

  /** The perfect release: a bright chime, the green on the meter. */
  green(): void {
    [84, 91].forEach((n, i) => tone(this.engine, this.engine.bus("ui"), this.at + i * 0.05, { type: "triangle", frequency: midi(n), decay: 0.25, peak: 0.25 }));
  }

  /** The shot clock horn. */
  horn(long = false): void {
    const out = this.out;
    for (const f of [233, 311, 466]) {
      tone(this.engine, out, this.at, { type: "sawtooth", frequency: f, attack: 0.02, decay: long ? 1.8 : 1.0, peak: 0.07 });
      tone(this.engine, out, this.at, { type: "square", frequency: f * 0.5, attack: 0.02, decay: long ? 1.8 : 1.0, peak: 0.04 });
    }
  }

  /** The shot clock's beep for each of the last seconds, higher as it runs out. */
  clockBeep(left: number): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: left <= 2 ? 1320 : 990, attack: 0.003, decay: 0.09, peak: 0.05 });
  }

  countdown(count: number): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 587, attack: 0.005, decay: 0.22, peak: 0.1 + (3 - count) * 0.02 });
  }

  go(): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 1175, attack: 0.005, decay: 0.5, peak: 0.12 });
    this.horn(false);
  }
}
