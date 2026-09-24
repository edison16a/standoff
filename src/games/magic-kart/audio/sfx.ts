import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * One shot sounds, each fired straight off the race event that also
 * drives the picture, so a hit sounds on the frame the kart starts to
 * spin. `level` scales a sound down for computer karts, so the players'
 * own moments stand out.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get at(): number {
    return this.engine.now + 0.005;
  }

  /** Three short beeps, then a high one for GO. */
  countdown(count: number): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 523, attack: 0.005, decay: 0.28, peak: 0.13 });
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 1046, decay: 0.2, peak: 0.08 * (4 - count) * 0.4 });
  }

  go(): void {
    tone(this.engine, this.out, this.at, { type: "square", frequency: 1046, attack: 0.005, decay: 0.7, peak: 0.14 });
    tone(this.engine, this.out, this.at, { type: "sawtooth", frequency: 523, attack: 0.005, decay: 0.6, peak: 0.06 });
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 5000, decay: 0.4, peak: 0.08 });
  }

  /** A sparkly rising arpeggio as a cube breaks. */
  pickup(level: number): void {
    const at = this.at;
    [84, 88, 91, 96].forEach((note, i) => {
      tone(this.engine, this.out, at + i * 0.045, { type: "triangle", frequency: midi(note), decay: 0.25, peak: 0.12 * level });
    });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 6000, decay: 0.3, peak: 0.1 * level });
    tone(this.engine, this.out, at, { type: "sine", frequency: 180, glideTo: 90, decay: 0.12, peak: 0.2 * level });
  }

  throwOrb(level: number): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 600, sweepTo: 3200, q: 2, attack: 0.02, decay: 0.3, peak: 0.35 * level });
    tone(this.engine, this.out, this.at, { type: "triangle", frequency: 440, glideTo: 1320, decay: 0.3, peak: 0.12 * level });
  }

  throwIce(level: number): void {
    const at = this.at;
    [2093, 2637, 3136, 4186].forEach((f, i) => tone(this.engine, this.out, at + i * 0.03, { type: "sine", frequency: f, decay: 0.35, peak: 0.07 * level }));
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 3000, sweepTo: 9000, decay: 0.35, peak: 0.18 * level });
  }

  /** The whoosh of any boost: a noise sweep over a rising growl. */
  boost(level: number, big: boolean): void {
    const decay = big ? 0.9 : 0.5;
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 400, sweepTo: 4000, q: 1.2, attack: 0.03, decay, peak: 0.4 * level });
    tone(this.engine, this.out, this.at, { type: "sawtooth", frequency: 110, glideTo: big ? 440 : 260, attack: 0.02, decay, peak: 0.07 * level });
  }

  vanish(level: number): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 1760, glideTo: 220, decay: 0.8, peak: 0.12 * level });
    tone(this.engine, this.out, this.at, { type: "triangle", frequency: 1318, glideTo: 165, decay: 0.8, peak: 0.06 * level, detune: 12 });
  }

  shield(level: number): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 220, glideTo: 880, attack: 0.05, decay: 0.5, peak: 0.14 * level });
    [76, 83, 88].forEach((n, i) => tone(this.engine, this.out, this.at + 0.1 + i * 0.05, { type: "triangle", frequency: midi(n), decay: 0.4, peak: 0.07 * level }));
  }

  /** Bonk, crash and a spinning whistle. */
  spinOut(level: number): void {
    const at = this.at;
    tone(this.engine, this.out, at, { type: "sine", frequency: 220, glideTo: 55, decay: 0.3, peak: 0.6 * level });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 2400, decay: 0.25, peak: 0.45 * level });
    for (let i = 0; i < 4; i++) {
      tone(this.engine, this.out, at + 0.1 + i * 0.16, { type: "sine", frequency: 1400 - i * 180, glideTo: 700 - i * 90, decay: 0.15, peak: 0.07 * level });
    }
  }

  /** Glass crack and a cold shimmer as the wheels ice over. */
  freeze(level: number): void {
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 4000, decay: 0.12, peak: 0.5 * level });
    [3520, 4699, 5274].forEach((f, i) => tone(this.engine, this.out, at + i * 0.02, { type: "sine", frequency: f, decay: 0.9, peak: 0.05 * level }));
    tone(this.engine, this.out, at, { type: "triangle", frequency: 900, glideTo: 300, decay: 0.4, peak: 0.08 * level });
  }

  blocked(level: number): void {
    const at = this.at;
    for (const [f, p] of [[1568, 0.12], [2349, 0.08], [3136, 0.05]] as const) tone(this.engine, this.out, at, { type: "sine", frequency: f, decay: 0.6, peak: p * level });
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 2500, decay: 0.06, peak: 0.3 * level });
  }

  bump(strength: number, level: number): void {
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 600 + strength * 900, decay: 0.12, peak: (0.2 + strength * 0.4) * level });
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 120, glideTo: 60, decay: 0.12, peak: (0.15 + strength * 0.3) * level });
  }

  jump(level: number): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 300, glideTo: 700, decay: 0.2, peak: 0.1 * level });
  }

  land(level: number): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 140, glideTo: 50, decay: 0.2, peak: 0.4 * level });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 900, decay: 0.15, peak: 0.25 * level });
  }

  /** A slide whistle down, for dropping off the edge. */
  fall(level: number): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 1200, glideTo: 180, attack: 0.02, decay: 0.9, peak: 0.12 * level });
  }

  respawn(level: number): void {
    [79, 84, 91].forEach((n, i) => tone(this.engine, this.out, this.at + i * 0.06, { type: "triangle", frequency: midi(n), decay: 0.3, peak: 0.08 * level }));
  }

  lap(): void {
    tone(this.engine, this.out, this.at, { type: "triangle", frequency: midi(84), decay: 0.3, peak: 0.16 });
    tone(this.engine, this.out, this.at + 0.12, { type: "triangle", frequency: midi(91), decay: 0.5, peak: 0.16 });
  }

  /** A quick rising jingle announcing the last lap. */
  finalLap(): void {
    const at = this.at;
    [72, 76, 79, 84, 88].forEach((n, i) => {
      tone(this.engine, this.out, at + i * 0.09, { type: "square", frequency: midi(n), decay: 0.18, peak: 0.07 });
      tone(this.engine, this.out, at + i * 0.09, { type: "triangle", frequency: midi(n + 12), decay: 0.2, peak: 0.06 });
    });
    for (const n of [84, 88, 91]) tone(this.engine, this.out, at + 0.5, { type: "sawtooth", frequency: midi(n), attack: 0.02, decay: 0.8, peak: 0.04 });
  }

  /** Crossing the line for the last time: a bright chord with a cymbal. */
  finish(): void {
    const at = this.at;
    [72, 79, 84].forEach((n, i) => tone(this.engine, this.out, at + i * 0.07, { type: "square", frequency: midi(n), decay: 0.25, peak: 0.07 }));
    for (const n of [76, 79, 84, 88]) tone(this.engine, this.out, at + 0.24, { type: "triangle", frequency: midi(n), attack: 0.01, decay: 1.1, peak: 0.07 });
    noise(this.engine, this.out, at + 0.24, { filter: "highpass", frequency: 5000, decay: 0.9, peak: 0.12 });
  }
}
