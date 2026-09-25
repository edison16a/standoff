import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import type { PowerKind } from "../engine/types";

/** A major scale, for coin chimes that climb as a streak goes on. */
const SCALE = [0, 2, 4, 5, 7, 9, 11];

/**
 * Every one shot sound of the run, synthesised on the spot. `pan` puts a
 * sound on its player's side of the room in split screen, so each hears
 * their own coins from their own half.
 */
export class Sfx {
  private readonly panners = new Map<number, StereoPannerNode>();

  constructor(private readonly engine: AudioEngine) {}

  private out(pan: number): AudioNode {
    let node = this.panners.get(pan);
    if (!node) {
      node = this.engine.ctx.createStereoPanner();
      node.pan.value = pan;
      node.connect(this.engine.bus("sfx"));
      this.panners.set(pan, node);
    }
    return node;
  }

  private get at(): number {
    return this.engine.now + 0.005;
  }

  /** A bright two note chime, higher with every coin in a streak. */
  coin(streak: number, pan: number): void {
    const step = Math.min(streak - 1, 13);
    const note = 83 + SCALE[step % 7]! + 12 * Math.floor(step / 7);
    const out = this.out(pan);
    tone(this.engine, out, this.at, { type: "square", frequency: midi(note), decay: 0.07, peak: 0.035 });
    tone(this.engine, out, this.at + 0.06, { type: "square", frequency: midi(note + 5), decay: 0.22, peak: 0.035 });
    tone(this.engine, out, this.at + 0.06, { type: "sine", frequency: midi(note + 17), decay: 0.3, peak: 0.04 });
  }

  footstep(pan: number, left: boolean): void {
    const out = this.out(pan);
    noise(this.engine, out, this.at, { filter: "lowpass", frequency: left ? 520 : 600, decay: 0.06, peak: 0.14 });
    tone(this.engine, out, this.at, { type: "sine", frequency: left ? 95 : 105, glideTo: 60, decay: 0.05, peak: 0.1 });
  }

  jump(pan: number, boots: boolean): void {
    const out = this.out(pan);
    noise(this.engine, out, this.at, { filter: "bandpass", frequency: 500, sweepTo: 2600, q: 1.4, decay: 0.22, peak: 0.22 });
    tone(this.engine, out, this.at, { type: "sine", frequency: boots ? 260 : 330, glideTo: boots ? 1300 : 720, decay: boots ? 0.4 : 0.18, peak: 0.1 });
    if (boots) tone(this.engine, out, this.at, { type: "triangle", frequency: 520, glideTo: 2080, decay: 0.45, peak: 0.05 });
  }

  land(pan: number, speed: number, roof: boolean): void {
    const out = this.out(pan);
    const hard = Math.min(1, speed / 14);
    noise(this.engine, out, this.at, { filter: "lowpass", frequency: roof ? 1400 : 800, decay: 0.12, peak: 0.18 + 0.2 * hard });
    tone(this.engine, out, this.at, { type: "sine", frequency: 120, glideTo: 50, decay: 0.14, peak: 0.2 + 0.2 * hard });
    // Train roofs ring like metal underfoot.
    if (roof) tone(this.engine, out, this.at, { type: "triangle", frequency: 420, glideTo: 380, decay: 0.25, peak: 0.05 });
  }

  roll(pan: number): void {
    noise(this.engine, this.out(pan), this.at, { filter: "bandpass", frequency: 2400, sweepTo: 300, q: 1.1, attack: 0.02, decay: 0.45, peak: 0.28 });
  }

  lane(pan: number, dir: number): void {
    noise(this.engine, this.out(pan + dir * 0.2), this.at, { filter: "bandpass", frequency: 900, sweepTo: 2800, q: 2, decay: 0.12, peak: 0.12 });
  }

  /** A metallic clang and a grunt as the runner glances off a train. */
  stumble(pan: number): void {
    const out = this.out(pan);
    noise(this.engine, out, this.at, { filter: "highpass", frequency: 1800, decay: 0.15, peak: 0.3 });
    for (const f of [640, 1010, 1470]) tone(this.engine, out, this.at, { type: "triangle", frequency: f, decay: 0.35, peak: 0.06 });
    tone(this.engine, out, this.at + 0.04, { type: "sawtooth", frequency: 190, glideTo: 120, decay: 0.16, peak: 0.07 });
  }

  /** The big one: a boom, bent metal, and a slide whistle down. */
  crash(pan: number): void {
    const out = this.out(pan);
    const at = this.at;
    tone(this.engine, out, at, { type: "sine", frequency: 160, glideTo: 35, decay: 0.6, peak: 0.7 });
    noise(this.engine, out, at, { filter: "lowpass", frequency: 3000, sweepTo: 400, decay: 0.5, peak: 0.55 });
    for (const f of [520, 830, 1190, 1760]) tone(this.engine, out, at, { type: "triangle", frequency: f, glideTo: f * 0.94, decay: 0.8, peak: 0.05 });
    tone(this.engine, out, at + 0.25, { type: "sine", frequency: 1500, glideTo: 200, attack: 0.02, decay: 0.9, peak: 0.08 });
  }

  /** The hoverboard shatters and takes the hit: glass and a shimmer. */
  saved(pan: number): void {
    const out = this.out(pan);
    noise(this.engine, out, this.at, { filter: "highpass", frequency: 3500, decay: 0.3, peak: 0.4 });
    [2637, 3136, 3951, 4699].forEach((f, i) => tone(this.engine, out, this.at + i * 0.03, { type: "sine", frequency: f, decay: 0.5, peak: 0.05 }));
    tone(this.engine, out, this.at, { type: "sine", frequency: 200, glideTo: 70, decay: 0.3, peak: 0.3 });
  }

  power(pan: number, kind: PowerKind): void {
    const out = this.out(pan);
    const roots: Record<PowerKind, number> = { boots: 72, hoverboard: 74, magnet: 76, double: 79, jetpack: 71 };
    const root = roots[kind];
    [0, 4, 7, 12, 16].forEach((n, i) => {
      tone(this.engine, out, this.at + i * 0.05, { type: "square", frequency: midi(root + n), decay: 0.16, peak: 0.04 });
      tone(this.engine, out, this.at + i * 0.05, { type: "sine", frequency: midi(root + n + 12), decay: 0.3, peak: 0.05 });
    });
    noise(this.engine, out, this.at, { filter: "highpass", frequency: 5000, sweepTo: 9000, decay: 0.5, peak: 0.12 });
  }

  powerEnd(pan: number): void {
    const out = this.out(pan);
    [79, 74, 67].forEach((n, i) => tone(this.engine, out, this.at + i * 0.07, { type: "triangle", frequency: midi(n), decay: 0.14, peak: 0.06 }));
  }

  /** A new zone and a higher multiplier. */
  level(pan: number): void {
    const out = this.out(pan);
    [72, 76, 79, 84].forEach((n, i) => tone(this.engine, out, this.at + i * 0.08, { type: "square", frequency: midi(n), decay: 0.25, peak: 0.05 }));
    noise(this.engine, out, this.at + 0.3, { filter: "highpass", frequency: 6000, decay: 0.6, peak: 0.1 });
  }

  /** Two notes of a train horn, dropping a little as it comes on. */
  horn(pan: number): void {
    const out = this.out(pan);
    for (const f of [311, 370, 466]) {
      tone(this.engine, out, this.at, { type: "sawtooth", frequency: f, glideTo: f * 0.94, attack: 0.05, decay: 0.9, peak: 0.028 });
    }
  }

  /** The rush of air from a train going by. */
  passBy(pan: number): void {
    noise(this.engine, this.out(pan), this.at, { filter: "bandpass", frequency: 400, sweepTo: 1600, q: 0.7, attack: 0.15, decay: 0.6, peak: 0.25 });
  }

  /** The guard's whistle: a shrill trill. */
  whistle(pan: number): void {
    const out = this.out(pan);
    for (let i = 0; i < 5; i++) tone(this.engine, out, this.at + i * 0.07, { type: "sine", frequency: i % 2 ? 2750 : 2900, decay: 0.08, peak: 0.07 });
  }

  countdown(go: boolean): void {
    const out = this.out(0);
    tone(this.engine, out, this.at, { type: "square", frequency: go ? 1046 : 523, attack: 0.005, decay: go ? 0.6 : 0.25, peak: 0.1 });
    if (go) noise(this.engine, out, this.at, { filter: "highpass", frequency: 5000, decay: 0.4, peak: 0.08 });
  }

  /** A tutorial move done, or a player calibrated. */
  tick(pan: number): void {
    const out = this.out(pan);
    tone(this.engine, out, this.at, { type: "sine", frequency: midi(88), decay: 0.2, peak: 0.1 });
    tone(this.engine, out, this.at + 0.08, { type: "sine", frequency: midi(95), decay: 0.3, peak: 0.1 });
  }

  pause(): void {
    tone(this.engine, this.out(0), this.at, { type: "triangle", frequency: 660, glideTo: 330, decay: 0.3, peak: 0.08 });
  }
}
