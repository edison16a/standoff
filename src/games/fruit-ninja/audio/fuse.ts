import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * The hiss of lit fuses, running for as long as a bomb is in the air. One
 * looping noise source serves every bomb: its level follows how many are
 * up, and a fast wobble on the level makes it spit and crackle.
 */
export class FuseHiss {
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private wobble: OscillatorNode | null = null;
  private level = 0;

  constructor(private readonly engine: AudioEngine) {}

  /** Call every frame with the number of bombs on screen. */
  set(bombs: number): void {
    const target = bombs > 0 ? Math.min(0.14, 0.07 + bombs * 0.03) : 0;
    if (target > 0 && !this.source) this.start();
    if (!this.gain || Math.abs(target - this.level) < 0.005) return;
    this.level = target;
    this.gain.gain.setTargetAtTime(target, this.engine.now, 0.08);
  }

  stop(): void {
    this.source?.stop();
    this.wobble?.stop();
    this.gain?.disconnect();
    this.source = null;
    this.wobble = null;
    this.gain = null;
    this.level = 0;
  }

  private start(): void {
    const { ctx } = this.engine;
    const source = ctx.createBufferSource();
    source.buffer = this.engine.noiseBuffer();
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 5200;
    band.Q.value = 0.9;
    const crackle = ctx.createGain();
    crackle.gain.value = 0.6;
    const wobble = ctx.createOscillator();
    wobble.type = "square";
    wobble.frequency.value = 23;
    const depth = ctx.createGain();
    depth.gain.value = 0.4;
    wobble.connect(depth).connect(crackle.gain);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(band).connect(crackle).connect(gain).connect(this.engine.bus("sfx"));
    source.start();
    wobble.start();
    this.source = source;
    this.wobble = wobble;
    this.gain = gain;
  }
}
