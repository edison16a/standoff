import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { createRoom, vary, type Room } from "./mix";

/**
 * The court's own sounds, synthesised: the ball on the hardwood, sneakers
 * squeaking, the net, the iron and the glass, passes and blocks, and the
 * horns. Each is a sharp transient, a body and a tail sent into the
 * arena's reverb, pitched a little differently every time.
 */
export class Sfx {
  private readonly room: Room;

  constructor(private readonly engine: AudioEngine) {
    this.room = createRoom(engine, engine.bus("sfx"), 1.8, 0.5);
  }

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get wet(): AudioNode {
    return this.room.input;
  }

  private get at(): number {
    return this.engine.now + 0.004;
  }

  /** The ball hitting the floor: a hollow thump with a little ring of the leather. */
  bounce(power: number, level = 1): void {
    const p = Math.min(1, power) * level;
    const f = vary(120, 0.06);
    tone(this.engine, this.out, this.at, { frequency: f, glideTo: f * 0.48, decay: 0.1, peak: 0.5 * p });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: vary(1100, 0.1), decay: 0.04, peak: 0.28 * p });
    tone(this.engine, this.wet, this.at, { type: "triangle", frequency: vary(420, 0.05), decay: 0.07, peak: 0.08 * p });
  }

  squeak(level = 1): void {
    const f = 2300 + Math.random() * 900;
    tone(this.engine, this.out, this.at, { frequency: f, glideTo: f * vary(1.25, 0.08), attack: 0.01, decay: 0.12, peak: 0.07 * level });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: f, q: 9, decay: 0.1, peak: 0.12 * level });
    noise(this.engine, this.wet, this.at, { filter: "bandpass", frequency: f, q: 6, decay: 0.08, peak: 0.08 * level });
  }

  /** Nothing but net, or the softer rattle of a ball that touched iron on the way. */
  net(swish: boolean): void {
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: vary(2600, 0.08), sweepTo: 7000, attack: 0.012, decay: swish ? 0.3 : 0.2, peak: swish ? 0.45 : 0.28 });
    noise(this.engine, this.out, at + 0.03, { filter: "bandpass", frequency: vary(4800, 0.1), q: 1.5, decay: 0.14, peak: 0.2 });
    // The cords snapping back: a softer second swish, then the room.
    noise(this.engine, this.out, at + 0.12, { filter: "bandpass", frequency: 3200, q: 1, decay: 0.12, peak: swish ? 0.12 : 0.06 });
    noise(this.engine, this.wet, at + 0.02, { filter: "highpass", frequency: 3000, decay: 0.3, peak: 0.2 });
  }

  /** The iron: a clank of inharmonic metal partials, louder and longer the harder it is hit. */
  rim(power: number): void {
    const p = 0.35 + Math.min(1, power) * 0.65;
    const pitch = vary(1, 0.03);
    [476, 1187, 1793, 2689, 3910].forEach((f, i) => {
      const options = { frequency: f * pitch * (0.98 + Math.random() * 0.04), decay: 0.25 + 0.5 / (i + 1), peak: (0.15 / (i * 0.6 + 1)) * p };
      tone(this.engine, this.out, this.at, options);
      if (i < 2) tone(this.engine, this.wet, this.at, { ...options, peak: options.peak * 0.6 });
    });
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 2500, decay: 0.03, peak: 0.35 * p });
  }

  /** The glass: a deep thud and a short shiver of the board. */
  board(power: number): void {
    const p = 0.4 + Math.min(1, power) * 0.6;
    tone(this.engine, this.out, this.at, { frequency: vary(95, 0.06), glideTo: 60, decay: 0.2, peak: 0.55 * p });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 1500, decay: 0.1, peak: 0.32 * p });
    tone(this.engine, this.wet, this.at + 0.01, { type: "triangle", frequency: vary(1850, 0.04), decay: 0.25, peak: 0.05 * p });
  }

  /** A dunk: the rim bent down hard, the whole stanchion shuddering, a low boom under it. */
  slam(power: number): void {
    this.rim(0.3);
    this.board(0);
    tone(this.engine, this.out, this.at, { frequency: vary(70, 0.05), glideTo: 36, decay: 0.55, peak: 0.3 * power });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 400, decay: 0.4, peak: 0.2 * power });
    noise(this.engine, this.wet, this.at, { filter: "lowpass", frequency: 1200, decay: 0.6, peak: 0.18 * power });
  }

  pass(): void {
    const f = vary(600, 0.1);
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: f, sweepTo: f * 3.2, q: 1.4, attack: 0.02, decay: 0.14, peak: 0.16 });
  }

  catch(): void {
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: vary(1300, 0.1), decay: 0.05, peak: 0.32 });
    tone(this.engine, this.out, this.at, { frequency: vary(180, 0.08), glideTo: 110, decay: 0.06, peak: 0.2 });
  }

  /** A hand on the ball: the slap of a block or a swipe. */
  slap(power = 1): void {
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 3500, decay: 0.015, peak: 0.3 * power });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(1600, 0.1), q: 0.8, decay: 0.08, peak: 0.5 * power });
    tone(this.engine, this.out, this.at, { frequency: vary(220, 0.08), glideTo: 120, decay: 0.08, peak: 0.28 * power });
    noise(this.engine, this.wet, this.at, { filter: "bandpass", frequency: 1600, q: 0.8, decay: 0.12, peak: 0.25 * power });
  }

  whoosh(): void {
    const f = vary(400, 0.12);
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: f, sweepTo: f * 3.5, q: 1.2, attack: 0.03, decay: 0.2, peak: 0.12 });
  }

  /** The jump off the floor, a soft scuff of the shoes. */
  takeoff(): void {
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: vary(700, 0.1), decay: 0.08, peak: 0.22 });
  }

  land(hard: boolean): void {
    tone(this.engine, this.out, this.at, { frequency: vary(90, 0.08), glideTo: 50, decay: hard ? 0.2 : 0.1, peak: hard ? 0.45 : 0.22 });
    if (hard) this.squeak(0.8);
  }

  /** The perfect release: a bright chime, the green on the meter. */
  green(): void {
    const ui = this.engine.bus("ui");
    [84, 91].forEach((n, i) => tone(this.engine, ui, this.at + i * 0.05, { type: "triangle", frequency: midi(n), decay: 0.25, peak: 0.25 }));
    tone(this.engine, ui, this.at + 0.1, { frequency: midi(96), decay: 0.4, peak: 0.08 });
  }

  /** The shot clock horn: a thick chord of buzzing reeds, with the building ringing after. */
  horn(long = false): void {
    const length = long ? 1.8 : 1.0;
    for (const f of [233, 311, 466]) {
      tone(this.engine, this.out, this.at, { type: "sawtooth", frequency: f, attack: 0.02, decay: length, peak: 0.06 });
      tone(this.engine, this.out, this.at, { type: "square", frequency: f * 0.5, attack: 0.02, decay: length, peak: 0.035 });
      tone(this.engine, this.wet, this.at, { type: "sawtooth", frequency: f, attack: 0.02, decay: length, peak: 0.03 });
    }
  }

  /** The referee's whistle: a pea rattling in a shrill two note trill, then the building's echo. */
  whistle(): void {
    const at = this.at;
    for (let i = 0; i < 16; i++) {
      const f = i % 2 === 0 ? 2950 : 3250;
      tone(this.engine, this.out, at + i * 0.028, { frequency: vary(f, 0.01), attack: 0.004, decay: 0.035, peak: 0.07 });
    }
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 3100, q: 4, attack: 0.01, decay: 0.45, peak: 0.08 });
    tone(this.engine, this.wet, at + 0.05, { frequency: 3100, decay: 0.5, peak: 0.03 });
  }

  /** The shot clock's beep for each of the last seconds, higher as it runs out. */
  clockBeep(left: number): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: left <= 2 ? 1320 : 990, attack: 0.003, decay: 0.09, peak: 0.05 });
  }

  countdown(count: number): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 587, attack: 0.005, decay: 0.22, peak: 0.1 + (3 - count) * 0.02 });
    tone(this.engine, this.wet, this.at, { type: "triangle", frequency: 587, decay: 0.3, peak: 0.06 });
  }

  go(): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 1175, attack: 0.005, decay: 0.5, peak: 0.1 });
    this.horn(false);
  }

  dispose(): void {
    this.room.dispose();
  }
}
