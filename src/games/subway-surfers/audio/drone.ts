import type { AudioEngine } from "@/platform/audio/audio-engine";

/** A looping hiss through a filter, for the jetpack's roar and the board's hum. */
export class Drone {
  private readonly gain: GainNode;
  private readonly source: AudioBufferSourceNode;

  constructor(engine: AudioEngine, frequency: number, pan: number) {
    const ctx = engine.ctx;
    this.source = ctx.createBufferSource();
    this.source.buffer = engine.noiseBuffer();
    this.source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    this.source.connect(filter).connect(this.gain).connect(panner).connect(engine.bus("sfx"));
    this.source.start();
  }

  set(level: number, at: number): void {
    this.gain.gain.setTargetAtTime(level, at, 0.12);
  }

  stop(): void {
    this.source.stop();
    this.gain.disconnect();
  }
}
