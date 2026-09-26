import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { PieceKind } from "../engine/arena";
import { sendTo, vary, type Placed } from "./mix";

/** What each kind of cover is made of, which is what a bullet hitting it sounds like. */
const MATERIAL: Record<PieceKind, "air" | "wood" | "metal"> = {
  can: "air", dorito: "air", cake: "air", brick: "air", snake: "air", tower: "wood", barrel: "metal", wall: "wood",
};

/**
 * The rest of the match's sounds: bullets striking cover and turf, the
 * tick of a hit landing (a bright ding for the head, a crunch for a
 * kill), the thud of being hit, footsteps on the turf, and the count in
 * and horn that start each round.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private out(p: Placed, gain = 1): GainNode {
    return sendTo(this.engine, this.engine.bus("sfx"), gain * p.gain, p.pan, 2);
  }

  /** A shot striking cover: an inflatable's thwap, a knock on wood or a ping off a drum. */
  impact(kind: PieceKind, p: Placed): void {
    const e = this.engine;
    const out = this.out(p, 0.55);
    const at = e.now + Math.min(0.12, p.distance / 340);
    switch (MATERIAL[kind]) {
      case "air":
        tone(e, out, at, { frequency: vary(170, 0.15), glideTo: 90, decay: 0.12, peak: 0.4 });
        noise(e, out, at, { filter: "bandpass", frequency: vary(900, 0.2), q: 1.5, decay: 0.06, peak: 0.3 });
        return;
      case "wood":
        tone(e, out, at, { type: "triangle", frequency: vary(420, 0.12), decay: 0.06, peak: 0.35 });
        noise(e, out, at, { filter: "bandpass", frequency: vary(1300, 0.2), q: 2, decay: 0.05, peak: 0.35 });
        return;
      case "metal":
        tone(e, out, at, { frequency: vary(1800, 0.1), decay: 0.25, peak: 0.14 });
        tone(e, out, at, { frequency: vary(2700, 0.1), decay: 0.15, peak: 0.08 });
        noise(e, out, at, { filter: "highpass", frequency: 3000, decay: 0.03, peak: 0.25 });
        return;
    }
  }

  /** A shot into the turf: a soft puff of dirt. */
  turf(p: Placed): void {
    noise(this.engine, this.out(p, 0.35), this.engine.now, { filter: "lowpass", frequency: vary(700, 0.2), decay: 0.07, peak: 0.3 });
  }

  /** The hit marker's sound, for the player who landed it. */
  marker(kind: "hit" | "head" | "kill", pan: number): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), 0.9, pan * 0.6, 2);
    const at = e.now;
    if (kind === "hit") {
      tone(e, out, at, { type: "triangle", frequency: 2100, decay: 0.05, peak: 0.28 });
      noise(e, out, at, { filter: "bandpass", frequency: 4200, q: 3, decay: 0.02, peak: 0.2 });
    } else if (kind === "head") {
      tone(e, out, at, { frequency: 2640, decay: 0.28, peak: 0.3 });
      tone(e, out, at, { frequency: 3960, decay: 0.16, peak: 0.12 });
      noise(e, out, at, { filter: "highpass", frequency: 5000, decay: 0.03, peak: 0.25 });
    } else {
      // A kill: a low crunch under two quick rising notes.
      noise(e, out, at, { filter: "lowpass", frequency: 900, decay: 0.12, peak: 0.45 });
      tone(e, out, at, { type: "square", frequency: midi(79), decay: 0.07, peak: 0.08 });
      tone(e, out, at + 0.07, { type: "square", frequency: midi(86), decay: 0.12, peak: 0.08 });
    }
  }

  /** Being hit: a padded thud and a sharp breath. */
  hurt(pan: number, heavy: boolean): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), heavy ? 0.9 : 0.65, pan * 0.6, 2);
    tone(e, out, e.now, { frequency: 90, glideTo: 45, decay: 0.18, peak: 0.6 });
    noise(e, out, e.now, { filter: "lowpass", frequency: 600, decay: 0.12, peak: 0.5 });
    noise(e, out, e.now + 0.04, { filter: "bandpass", frequency: 1300, q: 1.2, attack: 0.02, decay: 0.12, peak: 0.12 });
  }

  /** Going down: a heavier thud and a low fall into the turf. */
  down(p: Placed): void {
    const e = this.engine;
    const out = this.out(p, 0.8);
    tone(e, out, e.now + 0.35, { frequency: 70, glideTo: 38, decay: 0.3, peak: 0.6 });
    noise(e, out, e.now + 0.35, { filter: "lowpass", frequency: 500, decay: 0.2, peak: 0.45 });
  }

  /** One footfall on the turf. */
  step(p: Placed, run: boolean): void {
    noise(this.engine, this.out(p, run ? 0.28 : 0.18), this.engine.now, { filter: "lowpass", frequency: vary(420, 0.25), q: 1.4, decay: 0.07, peak: 0.5 });
  }

  /** The count in: a beep a second, and a horn for Fight. */
  beep(final: boolean): void {
    const out = sendTo(this.engine, this.engine.bus("sfx"), 0.7, 0, 2);
    tone(this.engine, out, this.engine.now, { type: "square", frequency: final ? 1320 : 880, decay: final ? 0.35 : 0.14, peak: 0.08 });
    tone(this.engine, out, this.engine.now, { frequency: final ? 1320 : 880, decay: final ? 0.4 : 0.16, peak: 0.2 });
  }

  horn(): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), 0.7, 0, 3);
    for (const note of [50, 57, 62]) tone(e, out, e.now, { type: "sawtooth", frequency: midi(note), attack: 0.03, decay: 0.9, peak: 0.05 });
    tone(e, out, e.now, { frequency: midi(38), decay: 0.8, peak: 0.25 });
  }
}
