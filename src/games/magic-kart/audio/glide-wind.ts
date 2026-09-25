import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * The rush of air under one kart's glider, running for the whole race
 * and silent until the wing opens. Two layers of the same noise: a low
 * body that swells with speed, and a thin whistle over the top that
 * rises in pitch as the kart flies faster. A slow wobble in the body's
 * filter keeps it from sounding like a steady hiss.
 */
export class GlideWind {
  private readonly source: AudioBufferSourceNode;
  private readonly body: BiquadFilterNode;
  private readonly whistle: BiquadFilterNode;
  private readonly bodyGain: GainNode;
  private readonly whistleGain: GainNode;
  private readonly wobble: OscillatorNode;

  constructor(
    private readonly engine: AudioEngine,
    /** Players' wind sits forward in the mix, computers' further back. */
    private readonly loudness: number,
  ) {
    const { ctx } = engine;
    const out = engine.bus("sfx");
    this.source = ctx.createBufferSource();
    this.source.buffer = engine.noiseBuffer();
    this.source.loop = true;
    this.body = ctx.createBiquadFilter();
    this.body.type = "lowpass";
    this.body.frequency.value = 500;
    this.body.Q.value = 0.8;
    this.whistle = ctx.createBiquadFilter();
    this.whistle.type = "bandpass";
    this.whistle.frequency.value = 1400;
    this.whistle.Q.value = 5;
    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.value = 0;
    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.value = 0;
    this.source.connect(this.body).connect(this.bodyGain).connect(out);
    this.source.connect(this.whistle).connect(this.whistleGain).connect(out);
    this.wobble = ctx.createOscillator();
    this.wobble.frequency.value = 0.7;
    const depth = ctx.createGain();
    depth.gain.value = 140;
    this.wobble.connect(depth).connect(this.body.frequency);
    const at = ctx.currentTime;
    this.source.start(at, Math.random() * 1.5);
    this.wobble.start(at);
  }

  /** `open` how far the glider is out, 0 to 1, and `speed` as a share of top speed. */
  set(open: number, speed: number): void {
    const now = this.engine.now;
    const pace = Math.min(1.4, speed);
    const level = open * this.loudness;
    this.bodyGain.gain.setTargetAtTime(level * (0.5 + 0.7 * pace), now, 0.12);
    this.whistleGain.gain.setTargetAtTime(level * 0.35 * pace, now, 0.12);
    this.body.frequency.setTargetAtTime(380 + pace * 700, now, 0.2);
    this.whistle.frequency.setTargetAtTime(900 + pace * 1300, now, 0.2);
  }

  stop(): void {
    const now = this.engine.now;
    this.bodyGain.gain.setTargetAtTime(0, now, 0.1);
    this.whistleGain.gain.setTargetAtTime(0, now, 0.1);
    this.source.stop(now + 0.6);
    this.wobble.stop(now + 0.6);
    this.source.onended = () => {
      this.bodyGain.disconnect();
      this.whistleGain.disconnect();
    };
  }
}
