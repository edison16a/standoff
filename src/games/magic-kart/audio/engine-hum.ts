import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * One kart's engine, running for the whole race. Two detuned oscillators
 * through a low pass filter give a buzzy little kart motor; the pitch and
 * brightness follow the speed, and a separate noise layer hisses while
 * the tyres slide. Everything is set with short time constants so speed
 * changes glide instead of stepping.
 */
export class EngineHum {
  private readonly main: OscillatorNode;
  private readonly sub: OscillatorNode;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;
  private readonly skid: AudioBufferSourceNode;
  private readonly skidFilter: BiquadFilterNode;
  private readonly skidGain: GainNode;

  constructor(
    private readonly engine: AudioEngine,
    /** Players' engines sit forward in the mix, computers' further back. */
    private readonly loudness: number,
    /** A small fixed detune per kart so four engines never phase into one drone. */
    detune: number,
  ) {
    const { ctx } = engine;
    const out = engine.bus("sfx");
    this.main = ctx.createOscillator();
    this.main.type = "sawtooth";
    this.main.detune.value = detune;
    this.sub = ctx.createOscillator();
    this.sub.type = "square";
    this.sub.detune.value = -detune;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 4;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    this.main.connect(this.filter);
    this.sub.connect(subGain).connect(this.filter);
    this.filter.connect(this.gain).connect(out);

    this.skid = ctx.createBufferSource();
    this.skid.buffer = engine.noiseBuffer();
    this.skid.loop = true;
    this.skidFilter = ctx.createBiquadFilter();
    this.skidFilter.type = "bandpass";
    this.skidFilter.frequency.value = 1400;
    this.skidFilter.Q.value = 1.2;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;
    this.skid.connect(this.skidFilter).connect(this.skidGain).connect(out);

    const at = ctx.currentTime;
    this.main.start(at);
    this.sub.start(at);
    this.skid.start(at, Math.random());
  }

  /**
   * `speed` 0 to about 1.4 of top speed, `throttle` whether the pedal is
   * down, `slide` 0 to 1 for drifting or skidding on sand, `boost` while
   * boosting.
   */
  set(speed: number, throttle: boolean, slide: number, boost: boolean, gone: boolean): void {
    const now = this.engine.now;
    const pitch = 48 + speed * 110 + (throttle ? 12 : 0) + (boost ? 30 : 0);
    this.main.frequency.setTargetAtTime(pitch, now, 0.06);
    this.sub.frequency.setTargetAtTime(pitch / 2, now, 0.06);
    this.filter.frequency.setTargetAtTime(380 + speed * 1500 + (boost ? 900 : 0), now, 0.08);
    const level = gone ? 0 : this.loudness * (0.45 + 0.35 * speed + (throttle ? 0.2 : 0));
    this.gain.gain.setTargetAtTime(level, now, 0.08);
    this.skidGain.gain.setTargetAtTime(gone ? 0 : slide * this.loudness * 1.6, now, 0.05);
    this.skidFilter.frequency.setTargetAtTime(900 + slide * 1400, now, 0.1);
  }

  stop(): void {
    const now = this.engine.now;
    this.gain.gain.setTargetAtTime(0, now, 0.1);
    this.skidGain.gain.setTargetAtTime(0, now, 0.1);
    for (const node of [this.main, this.sub, this.skid]) node.stop(now + 0.6);
    this.main.onended = () => {
      this.gain.disconnect();
      this.skidGain.disconnect();
    };
  }
}
