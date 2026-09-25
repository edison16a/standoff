import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise } from "../../../platform/audio/voices";

/** Band centres for the murmur, roughly where speech sits. */
const MURMUR_BANDS = [320, 540, 880, 1300];

/**
 * The crowd: a low murmur under the whole match, and cheers on top for the
 * moments that deserve one. The murmur is looped noise through a few
 * speech band filters, each wobbling on its own slow cycle so it never
 * settles into an obvious loop.
 */
export class Crowd {
  private murmur: { source: AudioBufferSourceNode; gain: GainNode; lfos: OscillatorNode[] } | null = null;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("crowd");
  }

  startMurmur(): void {
    if (this.murmur) return;
    const { ctx } = this.engine;
    const source = ctx.createBufferSource();
    source.buffer = this.engine.noiseBuffer();
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(0.22, ctx.currentTime, 1.2);
    gain.connect(this.out);

    const lfos: OscillatorNode[] = [];
    MURMUR_BANDS.forEach((frequency, index) => {
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = frequency;
      band.Q.value = 3;
      const level = ctx.createGain();
      level.gain.value = 0.5;
      // Each band swells and fades on its own slow, unrelated cycle.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13 + index * 0.071;
      const depth = ctx.createGain();
      depth.gain.value = 0.3;
      lfo.connect(depth).connect(level.gain);
      lfo.start();
      lfos.push(lfo);
      source.connect(band).connect(level).connect(gain);
    });
    source.start();
    this.murmur = { source, gain, lfos };
  }

  stopMurmur(): void {
    if (!this.murmur) return;
    const { source, gain, lfos } = this.murmur;
    const at = this.engine.now;
    gain.gain.setTargetAtTime(0.0001, at, 0.5);
    source.stop(at + 2.5);
    lfos.forEach((lfo) => lfo.stop(at + 2.5));
    this.murmur = null;
  }

  /** Brings the murmur up for a moment, like a crowd leaning in. */
  swell(seconds = 3): void {
    if (!this.murmur) return;
    const gain = this.murmur.gain.gain;
    const at = this.engine.now;
    gain.cancelScheduledValues(at);
    gain.setTargetAtTime(0.5, at, 0.3);
    gain.setTargetAtTime(0.22, at + seconds, 1.2);
  }

  /**
   * A cheer: a burst of many short noisy "voices" at vocal pitches, spread
   * over a second or two, on top of a broad roar. `intensity` from 0 to 1
   * sets how big and long it is.
   */
  cheer(intensity: number): void {
    const at = this.engine.now;
    const length = 1.2 + intensity * 1.6;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1100, q: 0.7, attack: 0.25, decay: length, peak: 0.25 + intensity * 0.25 });
    const voices = Math.round(14 + intensity * 26);
    for (let i = 0; i < voices; i++) {
      const start = at + Math.random() * length * 0.6;
      noise(this.engine, this.out, start, {
        filter: "bandpass",
        frequency: 700 + Math.random() * 2200,
        q: 6 + Math.random() * 6,
        attack: 0.04 + Math.random() * 0.08,
        decay: 0.25 + Math.random() * 0.5,
        peak: 0.12 + Math.random() * 0.12,
      });
    }
  }

  /** Polite applause after a touch: many hands, busiest at the start and thinning out. */
  applause(seconds = 2.2, density = 1): void {
    const at = this.engine.now + 0.15;
    const hands = Math.round(70 * density);
    for (let i = 0; i < hands; i++) {
      const t = Math.pow(Math.random(), 1.6) * seconds;
      const fade = 1 - (t / seconds) * 0.6;
      noise(this.engine, this.out, at + t, { filter: "bandpass", frequency: 1200 + Math.random() * 2000, q: 1.4, decay: 0.04, peak: (0.16 + Math.random() * 0.1) * fade });
    }
  }

  /** A sharp intake of breath from the stands, for a blade stopped at the last moment. */
  gasp(): void {
    const at = this.engine.now;
    for (const [frequency, peak] of [[520, 0.5], [950, 0.3]] as const) {
      noise(this.engine, this.out, at, { filter: "bandpass", frequency: frequency * (0.95 + Math.random() * 0.1), q: 2.5, attack: 0.06, decay: 0.55, peak });
    }
  }
}
