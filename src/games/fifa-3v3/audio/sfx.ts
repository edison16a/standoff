import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { createRoom, vary, type Room } from "./mix";

/**
 * The sounds of the ball and the players, all synthesised: the thump
 * of a strike, the ring of the post, the swish of the net, the thud of
 * the boards, the skid of a slide and the referee's whistle. The big
 * ones send a tail into the stadium's reverb, and every one is pitched
 * a little differently each time.
 */
export class Sfx {
  private readonly room: Room;

  constructor(private readonly engine: AudioEngine) {
    this.room = createRoom(engine, engine.bus("sfx"), 2.4, 0.4);
  }

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  private get wet(): AudioNode {
    return this.room.input;
  }

  private get at(): number {
    return this.engine.now + 0.005;
  }

  /** Leather on boot: a low thump with a slap on top, heavier for a harder strike. */
  kick(power: number): void {
    const at = this.at;
    const f = vary(150 + power * 40, 0.06);
    tone(this.engine, this.out, at, { frequency: f, glideTo: f * 0.36, decay: 0.12 + power * 0.08, peak: 0.45 + power * 0.3 });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: vary(1400, 0.1), q: 1.1, decay: 0.05 + power * 0.03, peak: 0.3 + power * 0.3 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 500, decay: 0.09, peak: 0.22 });
    // A hard strike echoes off the stands.
    if (power > 0.5) noise(this.engine, this.wet, at, { filter: "bandpass", frequency: 900, q: 0.8, decay: 0.15, peak: 0.3 * power });
  }

  pass(): void {
    const f = vary(180, 0.08);
    tone(this.engine, this.out, this.at, { frequency: f, glideTo: f * 0.45, decay: 0.08, peak: 0.35 });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(1100, 0.1), q: 1.3, decay: 0.035, peak: 0.2 });
  }

  /** A ball dropping onto the turf. */
  bounce(speed: number): void {
    const level = Math.min(1, speed / 10);
    tone(this.engine, this.out, this.at, { frequency: vary(110, 0.08), glideTo: 60, decay: 0.08, peak: 0.25 * level });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 700, decay: 0.05, peak: 0.12 * level });
  }

  /** The ball smacking the advertising boards: a hollow, rattling thud. */
  board(speed: number): void {
    const level = Math.min(1, speed / 14);
    const at = this.at;
    tone(this.engine, this.out, at, { type: "square", frequency: vary(95, 0.06), glideTo: 70, decay: 0.12, peak: 0.12 * level });
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 420, q: 2, decay: 0.18, peak: 0.45 * level });
    noise(this.engine, this.out, at + 0.03, { filter: "bandpass", frequency: vary(900, 0.1), q: 4, decay: 0.12, peak: 0.12 * level });
    noise(this.engine, this.wet, at, { filter: "bandpass", frequency: 500, q: 1, decay: 0.2, peak: 0.2 * level });
  }

  /** The post or bar ringing: a clang with long, bell like overtones. */
  post(speed: number): void {
    const level = Math.min(1, 0.4 + speed / 30);
    const at = this.at;
    const pitch = vary(1, 0.03);
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 2500, decay: 0.04, peak: 0.5 * level });
    for (const [f, peak, decay] of [[523, 0.2, 1.4], [1336, 0.13, 1.0], [2217, 0.08, 0.7], [3610, 0.05, 0.45]] as const) {
      tone(this.engine, this.out, at, { frequency: f * pitch, decay, peak: peak * level });
      tone(this.engine, this.wet, at, { frequency: f * pitch, decay, peak: peak * level * 0.5 });
    }
    tone(this.engine, this.out, at, { type: "triangle", frequency: 262 * pitch, decay: 0.5, peak: 0.12 * level });
  }

  /** The ball hitting the net: a soft whoosh with the rattle of the cords. */
  net(speed: number): void {
    const level = Math.min(1, speed / 18);
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(1800, 0.08), sweepTo: 700, q: 0.9, attack: 0.01, decay: 0.45, peak: 0.55 * level });
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 5000, decay: 0.25, peak: 0.12 * level });
    noise(this.engine, this.wet, this.at + 0.05, { filter: "bandpass", frequency: 1200, q: 0.8, decay: 0.3, peak: 0.2 * level });
  }

  /** A slide on wet turf: a long, gritty swish. */
  slide(): void {
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(2200, 0.1), sweepTo: 800, q: 0.7, attack: 0.03, decay: vary(0.5, 0.15), peak: 0.35 });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: 400, decay: 0.3, peak: 0.12 });
  }

  /** Boot meets boot, or body meets turf. */
  tackle(won: boolean): void {
    noise(this.engine, this.out, this.at, { filter: "highpass", frequency: 3000, decay: 0.015, peak: won ? 0.25 : 0.12 });
    tone(this.engine, this.out, this.at, { frequency: vary(90, 0.08), glideTo: 45, decay: 0.18, peak: won ? 0.6 : 0.3 });
    noise(this.engine, this.out, this.at, { filter: "lowpass", frequency: vary(900, 0.1), decay: 0.12, peak: won ? 0.4 : 0.2 });
  }

  /** Gloves closing on the ball. */
  catch(): void {
    tone(this.engine, this.out, this.at, { frequency: vary(130, 0.08), glideTo: 70, decay: 0.1, peak: 0.5 });
    noise(this.engine, this.out, this.at, { filter: "bandpass", frequency: vary(700, 0.1), q: 1.5, decay: 0.07, peak: 0.38 });
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
      osc.frequency.value = vary(2750, 0.02);
      trill.frequency.value = vary(28, 0.1);
      depth.gain.value = 160;
      trill.connect(depth).connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.2, at + 0.02);
      gain.gain.setValueAtTime(0.2, at + length - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain).connect(this.out);
      gain.connect(this.wet);
      osc.start(at);
      trill.start(at);
      osc.stop(at + length + 0.05);
      trill.stop(at + length + 0.05);
      osc.onended = () => gain.disconnect();
      noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2800, q: 3, attack: 0.02, decay: length, peak: 0.05 });
    }
  }

  /** A firework: a crack, a rolling boom, and the echo round the stands. */
  firework(): void {
    const at = this.at;
    noise(this.engine, this.out, at, { filter: "highpass", frequency: 2000, decay: 0.03, peak: 0.3 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: vary(1600, 0.15), decay: 0.9, peak: 0.35 });
    tone(this.engine, this.out, at, { frequency: vary(70, 0.1), glideTo: 30, decay: 0.7, peak: 0.4 });
    noise(this.engine, this.wet, at + 0.05, { filter: "lowpass", frequency: 1200, decay: 1.2, peak: 0.3 });
    noise(this.engine, this.out, at + 0.25, { filter: "highpass", frequency: 3000, decay: 0.8, peak: 0.08 });
  }

  /** The stadium horn after a goal. */
  horn(): void {
    const at = this.at;
    for (const f of [146.8, 185, 220]) {
      tone(this.engine, this.out, at, { type: "sawtooth", frequency: f, attack: 0.05, decay: 1.6, peak: 0.07 });
      tone(this.engine, this.wet, at, { type: "sawtooth", frequency: f, attack: 0.05, decay: 1.6, peak: 0.04 });
    }
  }

  dispose(): void {
    this.room.dispose();
  }
}
