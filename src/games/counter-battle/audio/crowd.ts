import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

/**
 * The stands and the field around them, synthesised: a murmur that
 * swells with the fighting, a breeze across the turf, an "ooh" for a
 * near thing, and a roar with whistles and claps for a kill or a round.
 */
export class Crowd {
  private beds: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode }[] = [];
  private level = 0.2;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("crowd");
  }

  start(): void {
    if (this.beds.length) return;
    // The crowd's murmur, and a low wind under it.
    this.beds = [this.bed("bandpass", 800, 0.5), this.bed("lowpass", 380, 0.7)];
    this.setLevel(this.level);
  }

  private bed(type: BiquadFilterType, frequency: number, q: number) {
    const ctx = this.engine.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.engine.noiseBuffer();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(filter).connect(gain).connect(this.out);
    src.start(this.engine.now, Math.random() * 1.5);
    return { src, gain, filter };
  }

  /** How worked up the crowd is, 0 hushed to 1 on its feet. */
  setLevel(level: number): void {
    this.level = Math.max(0, Math.min(1, level));
    const [murmur, wind] = this.beds;
    if (!murmur || !wind) return;
    const now = this.engine.now;
    murmur.gain.gain.setTargetAtTime(0.025 + this.level * 0.12, now, 0.6);
    murmur.filter.frequency.setTargetAtTime(600 + this.level * 800, now, 0.6);
    // The wind gusts a little on its own.
    wind.gain.gain.setTargetAtTime(0.05 + Math.random() * 0.03, now, 1.5);
  }

  /** Many voices on one vowel, rising and falling together. */
  private swell(base: number, formant: number, attack: number, hold: number, release: number, peak: number, glide: number): void {
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
      const f = base + (Math.random() - 0.5) * base * 0.35;
      osc.frequency.setValueAtTime(f, at);
      osc.frequency.linearRampToValueAtTime(f * glide, at + attack + hold);
      osc.connect(filter);
      osc.start(at + Math.random() * 0.06);
      osc.stop(end);
    }
    setTimeout(() => gain.disconnect(), (end - this.engine.now + 0.2) * 1000);
  }

  /** A near miss or a player low on health: the crowd draws breath. */
  ooh(): void {
    this.swell(210, 520, 0.2, 0.3, 0.7, 0.05, 1.2);
  }

  /** A roar: a wall of noise, whistles over the top, and claps. */
  cheer(power: number): void {
    const at = this.engine.now + 0.01;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1100, q: 0.5, attack: 0.06, decay: 1.2 + power * 1.4, peak: 0.18 + power * 0.26 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2500, q: 0.8, attack: 0.08, decay: 0.8 + power, peak: 0.06 + power * 0.1 });
    for (let i = 0; i < Math.round(1 + power * 3); i++) {
      const f = 1300 + Math.random() * 800;
      tone(this.engine, this.out, at + 0.1 + Math.random() * 0.7, { frequency: f * 0.8, glideTo: f * 1.2, attack: 0.05, decay: 0.4, peak: 0.028 });
    }
    this.claps(Math.round(6 + power * 14), 1.5);
    this.swell(300, 900, 0.08, 0.4 + power, 0.9, 0.02 + power * 0.03, 1.1);
  }

  /** Scattered hand claps over a stretch of time. */
  claps(count: number, over: number): void {
    const at = this.engine.now + 0.02;
    for (let i = 0; i < count; i++) noise(this.engine, this.out, at + Math.random() * over, { filter: "bandpass", frequency: 1400 + Math.random() * 900, q: 1.2, decay: 0.04, peak: 0.06 });
  }

  stop(): void {
    for (const { src, gain } of this.beds) {
      gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.3);
      src.stop(this.engine.now + 1.5);
    }
    this.beds = [];
  }
}
