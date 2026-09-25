import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { HitSound } from "../engine/moves";
import type { CharacterId } from "../roster";
import { HIT_VOICES, koBoom } from "./hits";
import { createRoom, vary, type Room } from "./mix";

/**
 * Every sound effect on the stage, synthesised on the effects bus: hits
 * of five kinds, swings in each fighter's style, jumps and landings,
 * shields, bolts, the ult, the KO boom and the countdown drums.
 */
export class Sfx {
  private readonly room: Room;

  constructor(private readonly engine: AudioEngine) {
    this.room = createRoom(engine, engine.bus("sfx"), 1.6, 0.45);
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

  hit(sound: HitSound, power: number): void {
    HIT_VOICES[sound](this.engine, this.out, this.wet, this.at, Math.max(0.25, Math.min(1, power)));
  }

  /** The air a move cuts through, in the fighter's own style. */
  swing(character: CharacterId, heavy: boolean): void {
    const at = this.at;
    const level = heavy ? 1 : 0.7;
    if (character === "mage") {
      const f = vary(660, 0.05);
      tone(this.engine, this.out, at, { type: "triangle", frequency: f, glideTo: f * 2, attack: 0.03, decay: 0.2, peak: 0.07 * level });
      noise(this.engine, this.out, at, { filter: "bandpass", frequency: 4200, q: 4, attack: 0.03, decay: 0.2, peak: 0.08 * level });
      return;
    }
    const base = character === "bear" ? 260 : character === "samurai" ? 900 : 560;
    const f = vary(base, 0.1);
    const decay = character === "bear" ? 0.28 : character === "samurai" ? 0.16 : 0.12;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: f, sweepTo: f * (character === "samurai" ? 4 : 2.6), q: character === "samurai" ? 2.4 : 1.3, attack: 0.02, decay, peak: 0.16 * level });
  }

  jump(double: boolean): void {
    const f = vary(double ? 520 : 340, 0.08);
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: f, sweepTo: f * 2.4, q: 1.1, attack: 0.01, decay: 0.12, peak: double ? 0.1 : 0.08 });
    if (double) tone(this.engine, this.out, this.at, { type: "triangle", frequency: vary(880, 0.03), glideTo: 1320, decay: 0.1, peak: 0.035 });
  }

  land(): void {
    tone(this.engine, this.out, this.at, { frequency: vary(95, 0.08), glideTo: 55, decay: 0.08, peak: 0.18 });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: vary(700, 0.1), decay: 0.05, peak: 0.1 });
  }

  /** A hit on the shield: a glassy tink and a low push. */
  block(): void {
    for (const r of [1, 2.4, 3.9]) tone(this.engine, this.out, this.at, { frequency: vary(1250, 0.03) * r, decay: 0.2, peak: 0.07 / r });
    tone(this.engine, this.out, this.at, { frequency: 180, glideTo: 120, decay: 0.08, peak: 0.25 });
    tone(this.engine, this.wet, this.at, { frequency: 2500, decay: 0.3, peak: 0.04 });
  }

  /** The shield shatters: glass, then a dizzy falling whistle. */
  shieldBreak(): void {
    const at = this.at;
    for (let i = 0; i < 10; i++) tone(this.engine, this.out, at + Math.random() * 0.12, { frequency: 2000 + Math.random() * 3000, decay: 0.15, peak: 0.04 });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 3500, decay: 0.3, peak: 0.3 });
    tone(this.engine, this.out, at + 0.1, { type: "triangle", frequency: 1200, glideTo: 300, attack: 0.02, decay: 0.7, peak: 0.08 });
  }

  /** A magic bolt leaving the staff. */
  bolt(): void {
    const f = vary(1200, 0.05);
    tone(this.engine, this.out, this.at, { type: "triangle", frequency: f, glideTo: f * 0.45, decay: 0.18, peak: 0.1 });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 3000, sweepTo: 1200, q: 3, decay: 0.18, peak: 0.1 });
  }

  /** A held button winding up: a hum rising in pitch until the charge is full. */
  charge(seconds: number): void {
    const at = this.at;
    tone(this.engine, this.out, at, { type: "triangle", frequency: vary(170, 0.05), glideTo: 680, attack: seconds, decay: 0.15, peak: 0.06 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 600, sweepTo: 3600, q: 3, attack: seconds, decay: 0.12, peak: 0.05 });
  }

  /** A little rising chime when a fighter's ult fills. */
  ultReady(): void {
    [72, 76, 79, 84].forEach((n, i) => tone(this.engine, this.out, this.at + i * 0.05, { type: "triangle", frequency: midi(n), decay: 0.3, peak: 0.07 }));
  }

  /** The ult going off: a charge sweeping up into a boom. */
  ult(): void {
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 400, sweepTo: 5000, q: 2, attack: 0.25, decay: 0.2, peak: 0.25 });
    tone(this.engine, this.out, at, { type: "sawtooth", frequency: 110, glideTo: 440, attack: 0.25, decay: 0.15, peak: 0.05 });
    tone(this.engine, this.out, at + 0.35, { frequency: 90, glideTo: 35, decay: 0.8, peak: 0.6 });
    noise(this.engine, this.wet, at + 0.35, { filter: "lowpass", frequency: 1500, decay: 1, peak: 0.35 });
  }

  ko(): void {
    koBoom(this.engine, this.out, this.wet, this.at);
  }

  /** A sparkle as the respawn platform appears. */
  respawn(): void {
    [84, 88, 91, 96].forEach((n, i) => tone(this.engine, this.out, this.at + i * 0.06, { frequency: midi(n), decay: 0.4, peak: 0.04 }));
  }

  /** Taiko drums for Ready, and a big hit with a cymbal for Fight. */
  countdown(call: "ready" | "fight"): void {
    const at = this.at;
    const drum = (t: number, peak: number) => {
      tone(this.engine, this.out, t, { frequency: 95, glideTo: 60, decay: 0.45, peak });
      noise(this.engine, this.out, t, { filter: "lowpass", frequency: 600, decay: 0.12, peak: peak * 0.4 });
    };
    if (call === "ready") {
      drum(at, 0.5);
      drum(at + 0.3, 0.4);
      return;
    }
    drum(at, 0.8);
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 5000, attack: 0.005, decay: 1.2, peak: 0.18 });
    noise(this.engine, this.wet, at, { filter: "bandpass", frequency: 2000, q: 0.6, decay: 1, peak: 0.2 });
  }

  /** The final gong for "Game!". */
  gong(): void {
    const at = this.at;
    [1, 1.47, 2.09, 2.56, 3.2].forEach((r, i) => {
      tone(this.engine, this.out, at, { frequency: 98 * r, decay: 2.8 - i * 0.3, peak: 0.16 / (i + 1) });
      tone(this.engine, this.wet, at, { frequency: 98 * r, decay: 2, peak: 0.08 / (i + 1) });
    });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 800, decay: 0.3, peak: 0.3 });
  }

  dispose(): void {
    this.room.dispose();
  }
}
