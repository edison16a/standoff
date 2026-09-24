/**
 * The Web Audio graph every sound goes through. Four buses (music, crowd,
 * effects, interface) feed one master gain, so the mix can be set per bus
 * and the music can be ducked under a cheer or a replay without touching
 * anything else.
 *
 * Web Audio instead of <audio> tags because hits and parries have to land
 * on the exact frame the animation does, and because buses and ducking
 * need a real mixer.
 */

export type BusName = "music" | "crowd" | "sfx" | "ui";

export interface BusLevels {
  music: number;
  crowd: number;
  sfx: number;
}

/** A short ramp so level changes never click. */
const RAMP_S = 0.08;

export class AudioEngine {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly buses: Record<BusName, GainNode>;
  /** Separate duck stage per bus, so ducking never fights the user's level. */
  private readonly ducks: Record<BusName, GainNode>;
  private noise: AudioBuffer | null = null;

  constructor() {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Context({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;

    // A gentle limiter keeps a cheer stacked on a hit from clipping.
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.master.connect(limiter).connect(this.ctx.destination);

    const make = () => this.ctx.createGain();
    this.buses = { music: make(), crowd: make(), sfx: make(), ui: make() };
    this.ducks = { music: make(), crowd: make(), sfx: make(), ui: make() };
    for (const name of Object.keys(this.buses) as BusName[]) {
      this.buses[name].connect(this.ducks[name]).connect(this.master);
    }
    this.buses.ui.gain.value = 0.5;
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  bus(name: BusName): AudioNode {
    return this.buses[name];
  }

  /**
   * Must run inside a tap or click. iOS Safari keeps audio suspended until
   * a user gesture resumes it, and playing one silent buffer in that same
   * gesture is what actually unlocks output on older iOS versions.
   */
  async unlock(): Promise<void> {
    const silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    const source = this.ctx.createBufferSource();
    source.buffer = silent;
    source.connect(this.ctx.destination);
    source.start();
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  get unlocked(): boolean {
    return this.ctx.state === "running";
  }

  setLevels(levels: BusLevels): void {
    for (const name of ["music", "crowd", "sfx"] as const) {
      this.buses[name].gain.setTargetAtTime(levels[name], this.now, RAMP_S);
    }
  }

  /** Dips a bus to `amount` of its level, then eases back after `holdS`. */
  duck(name: BusName, amount: number, holdS: number): void {
    const gain = this.ducks[name].gain;
    gain.cancelScheduledValues(this.now);
    gain.setTargetAtTime(amount, this.now, 0.04);
    gain.setTargetAtTime(1, this.now + holdS, 0.4);
  }

  /** Holds a bus at a level until told otherwise, used through a whole replay. */
  holdDuck(name: BusName, amount: number): void {
    const gain = this.ducks[name].gain;
    gain.cancelScheduledValues(this.now);
    gain.setTargetAtTime(amount, this.now, 0.15);
  }

  /** Two seconds of white noise, shared by every whoosh, crowd and cymbal. */
  noiseBuffer(): AudioBuffer {
    if (this.noise) return this.noise;
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  close(): void {
    void this.ctx.close();
  }
}
