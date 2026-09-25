import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise, tone } from "../../../platform/audio/voices";
import { createRoom, vary, type Room } from "./mix";

/**
 * One shot effects. Each is fired straight off the game event that also
 * drives the animation, so the whoosh and the lunge start together. The
 * big ones are a sharp transient, a body and a tail into the hall's
 * reverb, and every one is pitched a little differently each time.
 */
export class Sfx {
  private room: Room | null = null;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** Built on first use, so the phone, which only clicks and chimes, never pays for it. */
  private get wet(): AudioNode {
    this.room ??= createRoom(this.engine, this.engine.bus("sfx"), 1.6, 0.45);
    return this.room.input;
  }

  /** A sharp rising swish of the blade cutting air, for a jab. */
  jab(): void {
    const at = this.engine.now;
    const f = vary(900, 0.12);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: f, sweepTo: f * 4.6, q: 1.4, attack: 0.02, decay: vary(0.16, 0.1), peak: 0.7 });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: vary(5000, 0.1), attack: 0.01, decay: 0.08, peak: 0.15 });
    // The thin whistle of the steel itself, riding on the swish.
    tone(this.engine, this.out, at + 0.02, { frequency: vary(2400, 0.08), glideTo: 3600, attack: 0.02, decay: 0.1, peak: 0.03 });
  }

  /** A lighter, falling swish when a jab lands on nothing. */
  whiff(): void {
    const f = vary(2600, 0.1);
    noise(this.engine, this.out, this.engine.now, { filter: "bandpass", frequency: f, sweepTo: f * 0.27, q: 1.1, attack: 0.01, decay: 0.2, peak: 0.22 });
  }

  /** A blade raised to parry: a quick scrape of steel, quieter than a clash. */
  parry(): void {
    const at = this.engine.now;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: vary(4200, 0.1), sweepTo: 2600, q: 2.5, attack: 0.01, decay: 0.12, peak: 0.24 });
    tone(this.engine, this.out, at, { frequency: vary(2553, 0.04), decay: 0.18, peak: 0.05 });
  }

  /** Steel on steel: a bright strike plus a few inharmonic partials that ring round the hall. */
  clang(): void {
    const at = this.engine.now;
    const pitch = vary(1, 0.04);
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 3000, decay: 0.05, peak: 0.4 });
    for (const [frequency, peak, decay] of [
      [1870, 0.13, 0.7],
      [2553, 0.1, 0.55],
      [3411, 0.07, 0.45],
      [4987, 0.04, 0.3],
    ] as const) {
      tone(this.engine, this.out, at, { frequency: frequency * pitch, decay, peak });
      tone(this.engine, this.wet, at, { frequency: frequency * pitch, decay: decay * 1.4, peak: peak * 0.6 });
    }
  }

  /** A body hit: a crack, a low thump and the hall answering. */
  impact(): void {
    const at = this.engine.now;
    const f = vary(150, 0.06);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: vary(3200, 0.1), q: 2, decay: 0.05, peak: 0.28 });
    tone(this.engine, this.out, at, { frequency: f, glideTo: f * 0.36, decay: 0.28, peak: 0.5 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 1800, decay: 0.12, peak: 0.45 });
    noise(this.engine, this.wet, at, { filter: "lowpass", frequency: 2200, decay: 0.3, peak: 0.3 });
  }

  /** The starting signal: a short square buzz, like a real fencing box. */
  buzzer(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { type: "square", frequency: 440, attack: 0.005, decay: 0.45, peak: 0.12 });
    tone(this.engine, this.out, at, { type: "square", frequency: 443, attack: 0.005, decay: 0.45, peak: 0.08 });
    tone(this.engine, this.wet, at, { type: "square", frequency: 440, attack: 0.005, decay: 0.45, peak: 0.05 });
  }

  /** A soft tick for each second of the countdown. */
  tick(): void {
    tone(this.engine, this.out, this.engine.now, { type: "triangle", frequency: 1320, decay: 0.07, peak: 0.12 });
  }

  /** Two note chime when a touch is scored, apart from the impact itself. */
  chime(): void {
    const at = this.engine.now + 0.12;
    tone(this.engine, this.out, at, { type: "triangle", frequency: 1047, decay: 0.5, peak: 0.16 });
    tone(this.engine, this.out, at + 0.11, { type: "triangle", frequency: 1568, decay: 0.7, peak: 0.16 });
    tone(this.engine, this.out, at + 0.11, { frequency: 3136, decay: 0.3, peak: 0.03 });
  }

  /** A quiet click for interface actions, on its own bus. */
  click(): void {
    tone(this.engine, this.engine.bus("ui"), this.engine.now, { type: "triangle", frequency: 1800, decay: 0.035, peak: 0.25 });
  }

  dispose(): void {
    this.room?.dispose();
    this.room = null;
  }
}
