import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { PunchStyle } from "../engine/types";

/** How heavy each punch sounds, 0 to 1, before a counter or power adds to it. */
const WEIGHT: Record<PunchStyle, number> = { jab: 0.35, cross: 0.7, hook: 0.85 };

/**
 * The sounds of gloves: the swish of a punch leaving, the crack of one
 * landing, sized by how heavy it was, the dull pad of one caught on the
 * gloves, and the whoosh of one that found only air. All synthesised on
 * the sound effects bus, so they land on the frame the picture does.
 */
export class PunchSounds {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get at(): number {
    return this.engine.now + 0.004;
  }

  /** A short swish as the glove leaves the guard. */
  swing(style: PunchStyle, level = 1): void {
    const w = WEIGHT[style];
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 900, sweepTo: 2600 + w * 1200, q: 1.4, attack: 0.03, decay: 0.12 + w * 0.06, peak: 0.12 * level });
  }

  /**
   * Leather on a face. The weight sets how deep the thump goes and how
   * long the slap rings: a jab is a tight snap, a counter is a crack
   * with a boom under it.
   */
  hit(style: PunchStyle, weight: number): void {
    const w = Math.min(1.6, WEIGHT[style] * 0.6 + weight * 0.5);
    const at = this.at;
    // The slap of the leather.
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1800 - w * 500, q: 0.9, attack: 0.001, decay: 0.05 + w * 0.05, peak: 0.55 + w * 0.3 });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 3500, attack: 0.001, decay: 0.03, peak: 0.25 + 0.1 * w });
    // The body of it: a falling low thump.
    tone(this.engine, this.out, at, { type: "sine", frequency: 150 + 40 * w, glideTo: 45, attack: 0.002, decay: 0.12 + w * 0.12, peak: 0.45 + w * 0.35 });
    tone(this.engine, this.out, at, { type: "triangle", frequency: 90, glideTo: 38, attack: 0.002, decay: 0.08 + w * 0.2, peak: 0.2 * w });
    if (w > 0.9) {
      // A big one rings in the rafters for a moment.
      noise(this.engine, this.out, at + 0.01, { filter: "lowpass", frequency: 500, attack: 0.005, decay: 0.45, peak: 0.25 * (w - 0.6) });
    }
  }

  /** A punch caught on the gloves: a padded thud with no crack. */
  block(style: PunchStyle): void {
    const w = WEIGHT[style];
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 900 + 300 * w, attack: 0.002, decay: 0.09, peak: 0.45 + 0.2 * w });
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 110, glideTo: 70, attack: 0.002, decay: 0.1, peak: 0.3 + 0.2 * w });
    noise(this.engine, this.out, this.at + 0.015, { filter: "bandpass", frequency: 2400, q: 3, attack: 0.002, decay: 0.03, peak: 0.08 });
  }

  /** A punch that found nothing: a longer whoosh past the ear. */
  miss(style: PunchStyle): void {
    const w = WEIGHT[style];
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 2200, sweepTo: 500, q: 2.2, attack: 0.02, decay: 0.28 + 0.1 * w, peak: 0.22 });
  }

  /** A boxer hitting the canvas: a deep boom with the ring's boards rattling. */
  fall(): void {
    const at = this.engine.now + 0.35;
    tone(this.engine, this.out, at, { type: "sine", frequency: 70, glideTo: 30, attack: 0.004, decay: 0.6, peak: 0.9 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 400, attack: 0.004, decay: 0.5, peak: 0.6 });
    noise(this.engine, this.out, at + 0.02, { filter: "bandpass", frequency: 160, q: 4, attack: 0.01, decay: 0.3, peak: 0.25 });
  }

  /** A counter punch opening: a short bright ping so the player knows to fire. */
  counterReady(): void {
    tone(this.engine, this.engine.bus("ui"), this.at, { type: "triangle", frequency: 1318, decay: 0.12, peak: 0.25 });
    tone(this.engine, this.engine.bus("ui"), this.at + 0.05, { type: "triangle", frequency: 1976, decay: 0.16, peak: 0.2 });
  }
}
