import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

/**
 * The sounds of the ball and the players, all synthesised: the thump
 * of a strike, the ring of the post, the swish of the net, the thud of
 * the boards, the skid of a slide and the referee's whistle.
 */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get at(): number {
    return this.engine.now + 0.005;
  }

  /** Leather on boot: a low thump with a slap on top, heavier for a harder strike. */
  kick(power: number): void {
    const at = this.at;
    tone(this.engine, this.out, at, { type: "sine", frequency: 150 + power * 40, glideTo: 55, decay: 0.12 + power * 0.08, peak: 0.55 + power * 0.4 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1400, q: 1.1, decay: 0.05 + power * 0.03, peak: 0.35 + power * 0.35 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 500, decay: 0.09, peak: 0.25 });
  }

  pass(): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 180, glideTo: 80, decay: 0.08, peak: 0.35 });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 1100, q: 1.3, decay: 0.035, peak: 0.2 });
  }

  /** A ball dropping onto the turf. */
  bounce(speed: number): void {
    const level = Math.min(1, speed / 10);
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 110, glideTo: 60, decay: 0.08, peak: 0.25 * level });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 700, decay: 0.05, peak: 0.12 * level });
  }

  /** The ball smacking the advertising boards: a hollow, rattling thud. */
  board(speed: number): void {
    const level = Math.min(1, speed / 14);
    const at = this.at;
    tone(this.engine, this.out, at, { type: "square", frequency: 95, glideTo: 70, decay: 0.12, peak: 0.12 * level });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 420, q: 2, decay: 0.18, peak: 0.45 * level });
    noise(this.engine, this.out, at + 0.03, { filter: "bandpass", frequency: 900, q: 4, decay: 0.12, peak: 0.12 * level });
  }

  /** The post or bar ringing: a clang with long, bell like overtones. */
  post(speed: number): void {
    const level = Math.min(1, 0.4 + speed / 30);
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 2500, decay: 0.04, peak: 0.5 * level });
    for (const [f, peak, decay] of [[523, 0.22, 1.4], [1336, 0.14, 1.0], [2217, 0.09, 0.7], [3610, 0.05, 0.45]] as const) {
      tone(this.engine, this.out, at, { type: "sine", frequency: f, decay, peak: peak * level });
    }
    tone(this.engine, this.out, at, { type: "triangle", frequency: 262, decay: 0.5, peak: 0.12 * level });
  }

  /** The ball hitting the net: a soft whoosh with the rattle of the cords. */
  net(speed: number): void {
    const level = Math.min(1, speed / 18);
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 1800, sweepTo: 700, q: 0.9, attack: 0.01, decay: 0.45, peak: 0.55 * level });
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 5000, decay: 0.25, peak: 0.12 * level });
  }

  /** A slide on wet turf: a long, gritty swish. */
  slide(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 2200, sweepTo: 800, q: 0.7, attack: 0.03, decay: 0.5, peak: 0.35 });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 400, decay: 0.3, peak: 0.12 });
  }

  /** Boot meets boot, or body meets turf. */
  tackle(won: boolean): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 90, glideTo: 45, decay: 0.18, peak: won ? 0.7 : 0.35 });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 900, decay: 0.12, peak: won ? 0.45 : 0.2 });
  }

  /** Gloves closing on the ball. */
  catch(): void {
    tone(this.engine, this.out, this.at, { type: "sine", frequency: 130, glideTo: 70, decay: 0.1, peak: 0.55 });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: 700, q: 1.5, decay: 0.07, peak: 0.4 });
  }

  /**
   * The referee's whistle: a pea whistle's trill, a warble of two close
   * pitches. Long for full time, and full time gets three blasts.
   */
  whistle(long: boolean, blasts = 1): void {
    const { ctx } = this.engine;
    for (let b = 0; b < blasts; b++) {
      const at = this.at + b * (long ? 0.55 : 0.3);
      const length = long && b === blasts - 1 ? 1.1 : long ? 0.35 : 0.28;
      const osc = ctx.createOscillator();
      const trill = ctx.createOscillator();
      const depth = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 2750;
      trill.frequency.value = 28;
      depth.gain.value = 160;
      trill.connect(depth).connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.22, at + 0.02);
      gain.gain.setValueAtTime(0.22, at + length - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain).connect(this.out);
      osc.start(at);
      trill.start(at);
      osc.stop(at + length + 0.05);
      trill.stop(at + length + 0.05);
      osc.onended = () => gain.disconnect();
      noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2800, q: 3, attack: 0.02, decay: length, peak: 0.05 });
    }
  }

  /** A firework: a crack and a rolling boom, echoing round the stands. */
  firework(): void {
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 1600, decay: 0.9, peak: 0.45 });
    tone(this.engine, this.out, at, { type: "sine", frequency: 70, glideTo: 30, decay: 0.7, peak: 0.5 });
    noise(this.engine, this.out, at + 0.25, { filter: "highpass", frequency: 3000, decay: 0.8, peak: 0.08 });
  }

  /** The stadium horn after a goal. */
  horn(): void {
    const at = this.at;
    for (const f of [146.8, 185, 220]) {
      tone(this.engine, this.out, at, { type: "sawtooth", frequency: f, attack: 0.05, decay: 1.6, peak: 0.07 });
    }
  }
}
