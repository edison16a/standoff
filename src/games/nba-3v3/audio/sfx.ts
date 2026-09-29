import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { BallSounds } from "./ball-sounds";
import { createRoom, vary, type Room } from "./mix";
import { FOUL_CALL, playWhistle, STOP_CALL } from "./whistle";

/**
 * The court's own sounds, synthesised: the ball on the hardwood, sneakers
 * squeaking, the net, the iron and the glass, passes and blocks, and the
 * whistle. The horns and the organ are in `arena.ts`. Each is a sharp
 * transient, a body and a tail sent into the arena's reverb, pitched a
 * little differently every time.
 */
export class Sfx {
  private readonly room: Room;

  private readonly ball: BallSounds;

  constructor(private readonly engine: AudioEngine) {
    this.room = createRoom(engine, engine.bus("sfx"), 1.8, 0.5);
    this.ball = new BallSounds(engine, engine.bus("sfx"), this.room.input);
  }

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** The arena's reverb send, shared with the horns, the organ and the beat. */
  get wet(): AudioNode {
    return this.room.input;
  }

  private get at(): number {
    return this.engine.now + 0.004;
  }

  /** The ball on the hardwood (see `ball-sounds.ts`). */
  bounce(power: number, level = 1): void {
    this.ball.bounce(power, level);
  }

  squeak(level = 1): void {
    const f = 2300 + Math.random() * 900;
    tone(this.engine, this.out, this.at, { frequency: f, glideTo: f * vary(1.25, 0.08), attack: 0.01, decay: 0.12, peak: 0.07 * level });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: f, q: 9, decay: 0.1, peak: 0.12 * level });
    noise(this.engine, this.wet, this.at, { filter: "bandpass", frequency: f, q: 6, decay: 0.08, peak: 0.08 * level });
  }

  /** Nothing but net, or the shorter brush of a ball that touched iron on the way. */
  net(swish: boolean): void {
    this.ball.net(swish);
  }

  /** The iron, from a soft tick to a ringing clank, as hard as the physics hit it. */
  rim(power: number): void {
    this.ball.rim(power);
  }

  /** The glass: a boom of the board and a knock of the ball. */
  board(power: number): void {
    this.ball.board(power);
  }

  /** A dunk: the rim bent down hard, the whole stanchion shuddering, a low boom under it. */
  slam(power: number): void {
    this.rim(0.55);
    this.board(0.2);
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

  /** The referee's whistle for a dead ball: one firm blast (see `whistle.ts`). */
  whistle(): void {
    playWhistle(this.engine, this.out, this.wet, STOP_CALL);
  }

  /** A foul: a short chirp and a long hard blast. */
  foulWhistle(): void {
    playWhistle(this.engine, this.out, this.wet, FOUL_CALL);
  }

  countdown(count: number): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 587, attack: 0.005, decay: 0.22, peak: 0.1 + (3 - count) * 0.02 });
    tone(this.engine, this.wet, this.at, { type: "triangle", frequency: 587, decay: 0.3, peak: 0.06 });
  }

  go(): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 1175, attack: 0.005, decay: 0.5, peak: 0.1 });
  }

  dispose(): void {
    this.room.dispose();
  }
}
