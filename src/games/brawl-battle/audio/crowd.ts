import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

/**
 * The crowd round the stage, synthesised: a murmur that swells with the
 * fight, an "ooh" when someone is sent flying, a roar and whistles for a
 * KO, claps, and a stomp clap chant for the winner.
 */
export class Crowd {
  private bed: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private level = 0.2;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("crowd");
  }

  start(): void {
    if (this.bed) return;
    const ctx = this.engine.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.engine.noiseBuffer();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(filter).connect(gain).connect(this.out);
    src.start();
    this.bed = { src, gain, filter };
    this.setLevel(this.level);
  }

  /** How excited the crowd is, 0 hushed to 1 on its feet. */
  setLevel(level: number): void {
    this.level = Math.max(0, Math.min(1, level));
    if (!this.bed) return;
    const now = this.engine.now;
    this.bed.gain.gain.setTargetAtTime(0.03 + this.level * 0.14, now, 0.5);
    this.bed.filter.frequency.setTargetAtTime(600 + this.level * 900, now, 0.5);
  }

  /** Many voices on one vowel, rising and falling together. */
  private swell(base: number, spread: number, formant: number, attack: number, hold: number, release: number, peak: number, glide: number): void {
    const ctx = this.engine.ctx;
    const at = this.engine.now + 0.01;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = formant;
    filter.Q.value = 1.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + attack);
    gain.gain.setValueAtTime(peak, at + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
    filter.connect(gain).connect(this.out);
    const end = at + attack + hold + release + 0.05;
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const f = base + (Math.random() - 0.5) * spread;
      osc.frequency.setValueAtTime(f, at);
      osc.frequency.linearRampToValueAtTime(f * glide, at + attack + hold);
      osc.frequency.linearRampToValueAtTime(f * glide * 0.92, end);
      osc.connect(filter);
      osc.start(at + Math.random() * 0.06);
      osc.stop(end);
    }
    setTimeout(() => gain.disconnect(), (end - this.engine.now + 0.2) * 1000);
  }

  /** Someone sent flying at high damage: the crowd holds its breath. */
  ooh(): void {
    this.swell(210, 70, 500, 0.25, 0.3, 0.7, 0.06, 1.2);
  }

  /** A roar: a wall of noise, whistles over the top, and claps. */
  cheer(power: number): void {
    const at = this.engine.now + 0.01;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1100, q: 0.5, attack: 0.06, decay: 1.4 + power * 1.4, peak: 0.22 + power * 0.28 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2500, q: 0.8, attack: 0.08, decay: 1 + power, peak: 0.08 + power * 0.1 });
    const whistles = Math.round(1 + power * 3);
    for (let i = 0; i < whistles; i++) {
      const f = 1300 + Math.random() * 800;
      tone(this.engine, this.out, at + 0.1 + Math.random() * 0.7, { frequency: f * 0.8, glideTo: f * 1.2, attack: 0.05, decay: 0.4, peak: 0.03 });
    }
    this.claps(Math.round(6 + power * 14), 1.5);
    this.swell(300, 120, 900, 0.08, 0.4 + power, 0.9, 0.025 + power * 0.03, 1.1);
  }

  /** Scattered hand claps over a stretch of time. */
  claps(count: number, over: number): void {
    const at = this.engine.now + 0.02;
    for (let i = 0; i < count; i++) noise(this.engine, this.out, at + Math.random() * over, { filter: "bandpass", frequency: 1400 + Math.random() * 900, q: 1.2, decay: 0.04, peak: 0.07 });
  }

  /** Stomp stomp clap, four times over, for the winner. */
  stompClap(): void {
    const at = this.engine.now + 0.05;
    const beat = 0.42;
    for (let bar = 0; bar < 4; bar++) {
      const t = at + bar * beat * 4;
      for (const b of [0, 1]) {
        tone(this.engine, this.out, t + b * beat, { frequency: 70, glideTo: 45, decay: 0.2, peak: 0.28 });
        noise(this.engine, this.out, t + b * beat, { filter: "lowpass", frequency: 500, decay: 0.12, peak: 0.16 });
      }
      for (let i = 0; i < 14; i++) noise(this.engine, this.out, t + 2 * beat + Math.random() * 0.03, { filter: "bandpass", frequency: 1300 + Math.random() * 1200, q: 1.3, decay: 0.05, peak: 0.05 });
    }
  }

  stop(): void {
    if (!this.bed) return;
    const { src, gain } = this.bed;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.3);
    src.stop(this.engine.now + 1.5);
    this.bed = null;
  }
}
