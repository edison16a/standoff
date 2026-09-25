import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";

/**
 * The crowd: a constant murmur of thousands of people that swells with
 * the fight's excitement, plus one off reactions. An "ooh" at a big shot,
 * a cheer, and the roar of a knockout. Voices are made from many detuned
 * saw waves through vowel shaped filters, which reads as a crowd from a
 * distance. Everything goes on the crowd bus.
 */
export class CrowdSound {
  private readonly bed: GainNode;
  private readonly chatter: GainNode;
  private readonly tone: BiquadFilterNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private level = 0.3;

  constructor(private readonly engine: AudioEngine) {
    const { ctx } = engine;
    const out = engine.bus("crowd");
    // The murmur: looped noise through a low band, the room's rumble of voices.
    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 700;
    this.bed = ctx.createGain();
    this.bed.gain.value = 0;
    const low = this.loop();
    low.connect(this.tone).connect(this.bed).connect(out);
    // The chatter: a narrow band of voice frequencies wobbling slowly, so it never sounds like hiss.
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1100;
    band.Q.value = 0.8;
    this.chatter = ctx.createGain();
    this.chatter.gain.value = 0;
    const wobble = ctx.createOscillator();
    const depth = ctx.createGain();
    wobble.frequency.value = 0.35;
    depth.gain.value = 300;
    wobble.connect(depth).connect(band.frequency);
    wobble.start();
    this.sources.push(wobble);
    this.loop(0.7).connect(band).connect(this.chatter).connect(out);
  }

  /** How worked up the crowd is, 0 to 1. The murmur follows it over a second or so. */
  setExcitement(level: number): void {
    const next = Math.max(0, Math.min(1, level));
    if (Math.abs(next - this.level) < 0.02) return;
    this.level = next;
    const now = this.engine.now;
    this.bed.gain.setTargetAtTime(0.12 + 0.35 * next, now, 0.5);
    this.chatter.gain.setTargetAtTime(0.05 + 0.18 * next, now, 0.5);
    this.tone.frequency.setTargetAtTime(600 + 900 * next, now, 0.5);
  }

  start(): void {
    const now = this.engine.now;
    this.bed.gain.setTargetAtTime(0.12 + 0.35 * this.level, now, 1);
    this.chatter.gain.setTargetAtTime(0.05 + 0.18 * this.level, now, 1);
  }

  quiet(): void {
    const now = this.engine.now;
    this.bed.gain.setTargetAtTime(0.03, now, 0.6);
    this.chatter.gain.setTargetAtTime(0.01, now, 0.6);
  }

  /** "Ooh": the gasp at a heavy shot. */
  ooh(amount: number): void {
    this.voices(amount, 260, 0.75, 1.1, [420, 800]);
  }

  /** A cheer: open voices rising, for a clean counter or a round's end. */
  cheer(amount: number): void {
    this.voices(amount, 300, 1.25, 1.6, [700, 1200]);
    noise(this.engine, this.engine.bus("crowd"), this.engine.now, { filter: "bandpass", frequency: 1600, q: 0.7, attack: 0.15, decay: 1.4, peak: 0.25 * amount });
  }

  /** The whole arena on its feet, for a knockdown or a knockout. */
  roar(amount: number): void {
    this.voices(amount, 280, 1.3, 3.2, [650, 1150]);
    const out = this.engine.bus("crowd");
    noise(this.engine, out, this.engine.now, { filter: "bandpass", frequency: 1300, q: 0.6, attack: 0.3, decay: 3.4, peak: 0.45 * amount });
    noise(this.engine, out, this.engine.now, { filter: "lowpass", frequency: 500, attack: 0.3, decay: 3, peak: 0.35 * amount });
  }

  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.bed.disconnect();
    this.chatter.disconnect();
  }

  private loop(rate = 1): AudioBufferSourceNode {
    const source = this.engine.ctx.createBufferSource();
    source.buffer = this.engine.noiseBuffer();
    source.loop = true;
    source.playbackRate.value = rate;
    source.start();
    this.sources.push(source);
    return source;
  }

  /**
   * Many voices at once: detuned saws around `pitch`, gliding by `glide`,
   * shaped by two vowel formants, swelling and fading over `seconds`.
   * `rise` is the share of the time spent swelling, short for a chant.
   */
  voices(amount: number, pitch: number, glide: number, seconds: number, formants: [number, number], at = this.engine.now, rise = 0.2): void {
    const { ctx } = this.engine;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, at);
    out.gain.linearRampToValueAtTime(0.07 * amount, at + seconds * rise);
    out.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    out.connect(this.engine.bus("crowd"));
    const filters = formants.map((frequency) => {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = frequency;
      f.Q.value = 2.5;
      f.connect(out);
      return f;
    });
    for (let i = 0; i < 14; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      // Spread over most of an octave, with a little chance so no two reactions match.
      const start = pitch * (0.7 + ((i * 0.37 + Math.random() * 0.1) % 1) * 0.7);
      osc.frequency.setValueAtTime(start, at);
      osc.frequency.linearRampToValueAtTime(start * glide, at + seconds);
      for (const f of filters) osc.connect(f);
      osc.start(at + (i % 5) * 0.02);
      osc.stop(at + seconds + 0.1);
      osc.onended = () => osc.disconnect();
    }
    setTimeout(() => out.disconnect(), (at - this.engine.now + seconds + 0.5) * 1000);
  }
}
