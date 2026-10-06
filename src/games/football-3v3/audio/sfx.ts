import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { createRoom, vary, type Room } from "./mix";
import { pealessWhistle, WHISTLES } from "./whistle";

/**
 * The sounds on the field, all synthesised: pads cracking together, a
 * body hitting the turf, the boot on the ball, the snap, the throw and
 * the catch, cleats cutting, the officials' whistle and the stadium
 * horn. The big ones send a tail into the stadium's reverb, and every
 * one is pitched a little differently each time.
 */
export class Sfx {
  private readonly room: Room;

  constructor(private readonly engine: AudioEngine) {
    this.room = createRoom(engine, engine.bus("sfx"), 2.2, 0.35);
  }

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get wet(): AudioNode {
    return this.room.input;
  }

  private get at(): number {
    return this.engine.now + 0.005;
  }

  /** Shoulder pads meeting: the hard plastic crack, its hollow ring, and the thud of the bodies behind it. */
  pads(power: number): void {
    const p = Math.min(1, Math.max(0.15, power));
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: vary(1700, 0.12), q: 1.6, decay: 0.035, peak: 0.45 * p });
    tone(this.engine, this.out, at, { type: "triangle", frequency: vary(560, 0.1), glideTo: 420, decay: 0.07, peak: 0.16 * p });
    tone(this.engine, this.out, at, { frequency: vary(95, 0.08), glideTo: 55, decay: 0.16, peak: 0.5 * p });
    if (p > 0.6) noise(this.engine, this.wet, at, { filter: "bandpass", frequency: 1200, q: 0.8, decay: 0.12, peak: 0.25 * p });
  }

  /** A tackle: the hit, then the two of them landing on the turf a beat later. A sack lands harder. */
  tackle(sack: boolean): void {
    this.pads(sack ? 1 : 0.8);
    this.turf(this.at + 0.22, sack ? 1 : 0.8);
  }

  /** A body landing on the grass: a dull, heavy thump with a scrape of turf. */
  turf(at = this.at, power = 0.7): void {
    tone(this.engine, this.out, at, { frequency: vary(70, 0.08), glideTo: 40, decay: 0.25, peak: 0.45 * power });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: vary(420, 0.1), decay: 0.22, peak: 0.35 * power });
    noise(this.engine, this.out, at + 0.02, { filter: "bandpass", frequency: 2400, q: 0.7, decay: 0.12, peak: 0.06 * power });
  }

  /** Boot on the ball: a deep thump with the leather's pock, and the echo off the stands. A punt booms more. */
  kick(power: number, punt: boolean): void {
    const at = this.at;
    const p = 0.6 + power * 0.4;
    const f = vary(punt ? 105 : 125, 0.05);
    tone(this.engine, this.out, at, { frequency: f, glideTo: f * 0.45, decay: 0.2, peak: 0.75 * p });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: vary(900, 0.1), q: 1.3, decay: 0.05, peak: 0.45 * p });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 500, decay: 0.1, peak: 0.3 * p });
    noise(this.engine, this.wet, at, { filter: "bandpass", frequency: 700, q: 0.8, decay: 0.3, peak: 0.4 * p });
  }

  /** The center fires the ball back: a leather slap into the QB's hands. */
  snap(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(1300, 0.1), q: 1.4, decay: 0.03, peak: 0.28 });
    tone(this.engine, this.out, this.at, { frequency: vary(190, 0.08), glideTo: 120, decay: 0.05, peak: 0.25 });
  }

  /** The ball leaving the hand: a short rush of air, stronger for a harder throw. */
  throwBall(speed: number): void {
    const p = Math.min(1, speed / 25);
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 700, sweepTo: 2600, q: 1.2, attack: 0.02, decay: 0.22, peak: 0.16 * p + 0.04 });
  }

  /** Leather into gloves. */
  catchBall(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(1100, 0.1), q: 1.5, decay: 0.045, peak: 0.4 });
    tone(this.engine, this.out, this.at, { frequency: vary(170, 0.08), glideTo: 90, decay: 0.08, peak: 0.35 });
  }

  /** A pass falling to the turf, or knocked down. */
  bounce(): void {
    tone(this.engine, this.out, this.at, { frequency: vary(140, 0.1), glideTo: 70, decay: 0.07, peak: 0.25 });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 800, decay: 0.05, peak: 0.15 });
  }

  /** A kick off the posts: the clang of a padded steel tube, ringing on. */
  clang(power: number): void {
    const p = 0.4 + Math.min(1, power) * 0.6;
    for (const [f, d] of [[vary(520, 0.04), 1.1], [vary(1310, 0.04), 0.7], [vary(2170, 0.04), 0.45]] as const) {
      tone(this.engine, this.out, this.at, { type: "triangle", frequency: f, decay: d, peak: 0.07 * p });
      tone(this.engine, this.wet, this.at, { frequency: f, decay: d * 1.4, peak: 0.04 * p });
    }
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 3200, q: 2, decay: 0.03, peak: 0.2 * p });
  }

  /** Cleats biting into the turf on a cut. */
  cut(): void {
    for (const d of [0, 0.07]) noise(this.engine, this.out, this.at + d, { filter: "bandpass", frequency: vary(1900, 0.15), q: 0.8, decay: 0.06, peak: 0.12 });
  }

  /** A body flying through the air: a dive or a lunge. */
  whoosh(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 500, sweepTo: 1400, q: 0.9, attack: 0.04, decay: 0.28, peak: 0.12 });
  }

  /** The kick meter locking: a crisp click. */
  tick(good: boolean): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: good ? 1760 : 1180, decay: 0.035, peak: 0.07 });
  }

  /** A first down: two soft bell notes, like the broadcast's graphic. */
  chime(): void {
    tone(this.engine, this.out, this.at, { frequency: 1318.5, decay: 0.5, peak: 0.08 });
    tone(this.engine, this.out, this.at + 0.12, { frequency: 1760, decay: 0.7, peak: 0.08 });
  }

  /** The broadcast's replay swoosh, in and out. */
  swoosh(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 400, sweepTo: 5000, q: 0.8, attack: 0.08, decay: 0.35, peak: 0.12 });
  }

  whistle(pattern: keyof typeof WHISTLES): void {
    pealessWhistle(this.engine, this.out, this.wet, this.at, WHISTLES[pattern]);
  }

  /** The stadium horn after a touchdown: a deep, brassy chord. */
  horn(): void {
    const at = this.at;
    for (const f of [110, 138.6, 164.8]) {
      tone(this.engine, this.out, at, { type: "sawtooth", frequency: f, attack: 0.06, decay: 1.8, peak: 0.06 });
      tone(this.engine, this.wet, at, { type: "sawtooth", frequency: f, attack: 0.06, decay: 1.8, peak: 0.035 });
    }
  }

  dispose(): void {
    this.room.dispose();
  }
}
