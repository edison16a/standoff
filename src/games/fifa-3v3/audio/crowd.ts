import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise } from "@/platform/audio/voices";

const MURMUR_BANDS = [300, 520, 850, 1300, 2100];

/**
 * The crowd, synthesised: a murmur under the whole match that rises as
 * the ball nears a goal, a roar for goals, an "ooh" for near misses, a
 * groan, applause, and a chant with clapping between the goals.
 */
export class Crowd {
  private bed: { source: AudioBufferSourceNode; gain: GainNode; lfos: OscillatorNode[] } | null = null;
  private level = 0.2;
  private chantClock = 18;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("crowd");
  }

  start(): void {
    if (this.bed) return;
    const { ctx } = this.engine;
    const source = ctx.createBufferSource();
    source.buffer = this.engine.noiseBuffer();
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.out);
    const lfos: OscillatorNode[] = [];
    MURMUR_BANDS.forEach((frequency, i) => {
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = frequency;
      band.Q.value = 2.5;
      const voice = ctx.createGain();
      voice.gain.value = 0.5;
      // Every band swells on its own slow cycle, so the murmur never loops audibly.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11 + i * 0.067;
      const depth = ctx.createGain();
      depth.gain.value = 0.3;
      lfo.connect(depth).connect(voice.gain);
      lfo.start();
      lfos.push(lfo);
      source.connect(band).connect(voice).connect(gain);
    });
    source.start();
    this.bed = { source, gain, lfos };
    this.setLevel(0.2);
  }

  stop(): void {
    if (!this.bed) return;
    const at = this.engine.now;
    this.bed.gain.gain.setTargetAtTime(0.0001, at, 0.4);
    this.bed.source.stop(at + 2);
    for (const lfo of this.bed.lfos) lfo.stop(at + 2);
    this.bed = null;
  }

  /** 0 hushed to 1 on its feet. */
  setLevel(level: number): void {
    if (!this.bed || Math.abs(level - this.level) < 0.02) return;
    this.level = level;
    this.bed.gain.gain.setTargetAtTime(0.12 + level * 0.5, this.engine.now, 0.6);
  }

  /** A roar: a broad swell of noise with many voices shouting inside it. */
  roar(intensity: number): void {
    const at = this.engine.now;
    const length = 1.6 + intensity * 2.4;
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 900, q: 0.6, attack: 0.18, decay: length, peak: 0.35 + intensity * 0.35 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 500, attack: 0.25, decay: length * 0.8, peak: 0.25 * intensity });
    const voices = Math.round(18 + intensity * 30);
    for (let i = 0; i < voices; i++) {
      noise(this.engine, this.out, at + Math.random() * length * 0.6, {
        filter: "bandpass",
        frequency: 600 + Math.random() * 2400,
        q: 6 + Math.random() * 6,
        attack: 0.04 + Math.random() * 0.08,
        decay: 0.3 + Math.random() * 0.6,
        peak: 0.1 + Math.random() * 0.12,
      });
    }
  }

  /**
   * "Ooh": thousands of voices on one vowel, rising then falling. Built
   * from a buzzy chord through the two formants of an "oo".
   */
  ooh(): void {
    this.vowel([350, 800], 1.6, 1.25, 0.9);
  }

  /** A disappointed groan: an "aw", falling. */
  groan(): void {
    this.vowel([650, 1100], 1.3, 1, 0.75);
  }

  private vowel(formants: readonly [number, number], length: number, rise: number, fall: number): void {
    const { ctx } = this.engine;
    const at = this.engine.now;
    const mix = ctx.createGain();
    mix.gain.setValueAtTime(0.0001, at);
    mix.gain.linearRampToValueAtTime(0.5, at + 0.25);
    mix.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < 14; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const base = 110 + Math.random() * 140;
      osc.frequency.setValueAtTime(base, at);
      osc.frequency.linearRampToValueAtTime(base * rise, at + 0.4);
      osc.frequency.linearRampToValueAtTime(base * fall, at + length);
      const g = ctx.createGain();
      g.gain.value = 0.02;
      osc.connect(g).connect(mix);
      oscs.push(osc);
    }
    let node: AudioNode = mix;
    for (const f of formants) {
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = f;
      band.Q.value = 3;
      node.connect(band);
      node = band;
    }
    node.connect(this.out);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: formants[0], q: 1, attack: 0.2, decay: length, peak: 0.15 });
    for (const osc of oscs) {
      osc.start(at);
      osc.stop(at + length + 0.1);
    }
    oscs[0]!.onended = () => mix.disconnect();
  }

  applause(seconds = 2.5): void {
    const at = this.engine.now;
    for (let i = 0; i < 90; i++) {
      noise(this.engine, this.out, at + Math.random() * seconds, { filter: "bandpass", frequency: 1500 + Math.random() * 2500, q: 1.5, decay: 0.05, peak: 0.12 + Math.random() * 0.08 });
    }
  }

  /**
   * Now and then in open play: a chant. Three claps and a sung phrase
   * of "oh" voices, the way a home end starts one up.
   */
  frame(dt: number, playing: boolean): void {
    if (!playing) return;
    this.chantClock -= dt;
    if (this.chantClock > 0) return;
    this.chantClock = 22 + Math.random() * 16;
    this.chant();
  }

  chant(): void {
    const at = this.engine.now;
    const beat = 0.42;
    // Clap, clap, clap-clap-clap.
    [0, 1, 2, 2.5, 3].forEach((b) => {
      for (let i = 0; i < 12; i++) noise(this.engine, this.out, at + b * beat + Math.random() * 0.03, { filter: "bandpass", frequency: 1600 + Math.random() * 1800, q: 1.8, decay: 0.06, peak: 0.09 });
    });
    // Oh le, oh le oh le: a simple rising and falling phrase.
    const notes = [64, 67, 64, 67, 69, 67, 64];
    const { ctx } = this.engine;
    notes.forEach((note, i) => {
      const start = at + 4 * beat + i * beat * 0.9;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 700;
      band.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.09, start + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, start + beat * 0.9);
      band.connect(g).connect(this.out);
      for (let v = 0; v < 6; v++) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midi(note - 12) * (1 + (Math.random() - 0.5) * 0.02);
        osc.connect(band);
        osc.start(start);
        osc.stop(start + beat);
        if (v === 0) osc.onended = () => g.disconnect();
      }
    });
  }
}
