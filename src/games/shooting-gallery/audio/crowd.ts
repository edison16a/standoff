import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";

/**
 * The onlookers round the booth: applause, a cheer, an impressed "ooh"
 * and a two finger whistle. Voices are many detuned saws through vowel
 * shaped filters, and applause is dozens of single claps, so nothing is
 * a loop and no two reactions are the same. All on the crowd bus.
 */
export class Crowd {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("crowd");
  }

  /** Hands together: `amount` sets how many people and how long. */
  applause(amount: number, delay = 0): void {
    const at = this.engine.now + delay;
    const seconds = 1.2 + amount * 1.8;
    const claps = Math.round(40 * amount * seconds);
    for (let i = 0; i < claps; i++) {
      // Most claps come early, then it thins out as people stop.
      const t = at + seconds * Math.pow(Math.random(), 1.6);
      const fade = 1 - (t - at) / seconds;
      noise(this.engine, this.out, t, {
        filter: "bandpass",
        frequency: 900 + Math.random() * 1700,
        q: 1.2 + Math.random(),
        attack: 0.001,
        decay: 0.025 + Math.random() * 0.04,
        peak: (0.1 + Math.random() * 0.14) * fade,
      });
    }
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1600, q: 0.5, attack: 0.1, decay: seconds, peak: 0.08 * amount });
  }

  /** A cheer with a whistle over it, for a win or a golden duck. */
  cheer(amount: number, delay = 0): void {
    const at = this.engine.now + delay;
    this.voices(at, amount, 290, 1.3, 1.6, [700, 1150]);
    this.whistle(at + 0.25 + Math.random() * 0.2, amount);
  }

  /** An impressed "ooh", for a streak or a bullseye. */
  ooh(amount: number): void {
    this.voices(this.engine.now + 0.08, amount, 250, 0.85, 1.1, [400, 800]);
  }

  /** Two fingers in the mouth: up, down and up again. */
  private whistle(at: number, amount: number): void {
    const { ctx } = this.engine;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 1900 + Math.random() * 300;
    osc.frequency.setValueAtTime(base, at);
    osc.frequency.exponentialRampToValueAtTime(base * 1.45, at + 0.16);
    osc.frequency.exponentialRampToValueAtTime(base * 1.1, at + 0.3);
    osc.frequency.exponentialRampToValueAtTime(base * 1.5, at + 0.55);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.05 * amount, at + 0.04);
    gain.gain.setValueAtTime(0.04 * amount, at + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
    osc.connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + 0.7);
    osc.onended = () => gain.disconnect();
  }

  /** Many voices at once around `pitch`, gliding by `glide`, shaped by two vowel formants. */
  private voices(at: number, amount: number, pitch: number, glide: number, seconds: number, formants: [number, number]): void {
    const { ctx } = this.engine;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, at);
    out.gain.linearRampToValueAtTime(0.06 * amount, at + seconds * 0.2);
    out.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    out.connect(this.out);
    const filters = formants.map((frequency) => {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = frequency;
      f.Q.value = 2.5;
      f.connect(out);
      return f;
    });
    for (let i = 0; i < 12; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const start = pitch * (0.7 + Math.random() * 0.7);
      osc.frequency.setValueAtTime(start, at);
      osc.frequency.linearRampToValueAtTime(start * glide, at + seconds);
      for (const f of filters) osc.connect(f);
      osc.start(at + Math.random() * 0.08);
      osc.stop(at + seconds + 0.1);
      osc.onended = () => osc.disconnect();
    }
    setTimeout(() => out.disconnect(), (at - this.engine.now + seconds + 0.5) * 1000);
  }
}
