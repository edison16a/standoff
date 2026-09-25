import type { AudioEngine } from "@/platform/audio/audio-engine";

/** The whole song's level into the music bus. */
const LEVEL = 0.6;

/** A short hall made of fading noise, so no sample files are needed. */
function hall(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
  }
  return buffer;
}

/**
 * The music's own little studio, feeding the platform's music bus so the
 * volume setting still rules it. Three inputs: `dry` for drums and bass,
 * `space` for leads and plucks with an echo on the beat and a hall, and
 * `pumped` for pads, which dip under every kick like a dance record.
 */
export class MusicMixer {
  readonly dry: GainNode;
  readonly space: GainNode;
  readonly pumped: GainNode;
  /** Everything passes here, so the whole song can fade or be muffled at once. */
  readonly master: GainNode;
  private readonly muffle: BiquadFilterNode;
  private readonly echo: DelayNode;
  private readonly pump: GainNode;

  constructor(private readonly engine: AudioEngine) {
    const { ctx } = engine;
    this.master = ctx.createGain();
    // The band peaks near full scale, so it comes in lower, leaving room for the effects on top.
    this.master.gain.value = LEVEL;
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = "lowpass";
    this.muffle.frequency.value = 18000;
    this.master.connect(this.muffle).connect(engine.bus("music"));

    this.dry = ctx.createGain();
    this.dry.connect(this.master);

    const reverb = ctx.createConvolver();
    reverb.buffer = hall(ctx, 2.2);
    const reverbLevel = ctx.createGain();
    reverbLevel.gain.value = 0.32;
    reverb.connect(reverbLevel).connect(this.master);

    this.echo = ctx.createDelay(2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.33;
    const darken = ctx.createBiquadFilter();
    darken.type = "lowpass";
    darken.frequency.value = 2600;
    const echoLevel = ctx.createGain();
    echoLevel.gain.value = 0.3;
    this.echo.connect(darken).connect(feedback).connect(this.echo);
    darken.connect(echoLevel).connect(this.master);

    this.space = ctx.createGain();
    this.space.connect(this.master);
    this.space.connect(this.echo);
    this.space.connect(reverb);

    this.pump = ctx.createGain();
    this.pumped = ctx.createGain();
    this.pumped.connect(this.pump).connect(this.master);
    this.pump.connect(reverb);
  }

  /** The echo repeats on the dotted eighth, which sits in the groove at any tempo. */
  setTempo(bpm: number): void {
    this.echo.delayTime.setValueAtTime((60 / bpm) * 0.75, this.engine.now);
  }

  /** Ducks the pads for a moment at each kick. */
  duckAt(at: number, beat: number): void {
    const gain = this.pump.gain;
    gain.setValueAtTime(0.35, at);
    gain.linearRampToValueAtTime(1, at + beat * 0.6);
  }

  /** Muffles the song, as if heard from another room, while a run is paused. */
  setMuffled(muffled: boolean): void {
    this.muffle.frequency.setTargetAtTime(muffled ? 500 : 18000, this.engine.now, 0.15);
  }

  fadeTo(level: number, seconds: number): void {
    const gain = this.master.gain;
    gain.cancelScheduledValues(this.engine.now);
    gain.setTargetAtTime(Math.max(0.0001, level * LEVEL), this.engine.now, seconds / 3);
  }

  dispose(): void {
    this.master.disconnect();
  }
}
