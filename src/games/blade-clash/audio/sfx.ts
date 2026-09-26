import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise, tone } from "../../../platform/audio/voices";
import { createRoom, vary, type Room } from "./mix";

/**
 * One shot effects. Each is fired straight off the game event that also
 * drives the picture, so the whoosh and the swing start together. The
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

  /** The swish of a blade cutting the air, bigger and brighter for a faster swing (`strength` 0 to 1). */
  whoosh(strength: number): void {
    const at = this.engine.now;
    const f = vary(700 + 500 * strength, 0.12);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: f, sweepTo: f * 3.6, q: 1.4, attack: 0.02, decay: vary(0.14 + 0.08 * strength, 0.1), peak: 0.35 + 0.4 * strength });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: vary(5000, 0.1), attack: 0.01, decay: 0.08, peak: 0.1 + 0.1 * strength });
  }

  /** Steel on steel: a bright strike plus a few inharmonic partials that ring round the hall, louder for a harder clash. */
  clang(strength = 0.5): void {
    const at = this.engine.now;
    const pitch = vary(1, 0.04);
    const loud = 0.6 + 0.6 * strength;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 3000, decay: 0.05, peak: 0.4 * loud });
    for (const [frequency, peak, decay] of [
      [1870, 0.13, 0.7],
      [2553, 0.1, 0.55],
      [3411, 0.07, 0.45],
      [4987, 0.04, 0.3],
    ] as const) {
      tone(this.engine, this.out, at, { frequency: frequency * pitch, decay, peak: peak * loud });
      tone(this.engine, this.wet, at, { frequency: frequency * pitch, decay: decay * 1.4, peak: peak * 0.6 * loud });
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

  /** The starting signal: a struck gong, low and long. */
  gong(): void {
    const at = this.engine.now;
    for (const [frequency, peak, decay] of [
      [98, 0.3, 2.4],
      [196.7, 0.14, 1.8],
      [262, 0.08, 1.4],
      [331, 0.05, 1],
    ] as const) {
      tone(this.engine, this.out, at, { frequency, decay, peak });
      tone(this.engine, this.wet, at, { frequency, decay: decay * 1.2, peak: peak * 0.5 });
    }
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 900, decay: 0.12, peak: 0.3 });
  }

  /** A soft tick for each second of the countdown. */
  tick(): void {
    tone(this.engine, this.out, this.engine.now, { type: "triangle", frequency: 1320, decay: 0.07, peak: 0.12 });
  }

  /** A two note chime: a calibration target captured on the phone, or the winning blow on the big screen. */
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
