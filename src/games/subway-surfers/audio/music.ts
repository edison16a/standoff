import type { AudioEngine } from "@/platform/audio/audio-engine";
import { playFanfare, playStep, TUNES, type Tune } from "./tunes";

export type TuneName = keyof typeof TUNES;

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * One looping tune at a time, booked ahead on the audio clock by a timer
 * so the beat stays tight while the page is busy drawing. Tunes fade
 * through their own gain so a switch never cuts a note off.
 */
export class Music {
  private current: { name: TuneName; tune: Tune; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly tone: BiquadFilterNode;
  private tempo = 1;

  constructor(private readonly engine: AudioEngine) {
    this.tone = engine.ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 5200;
    this.tone.connect(engine.bus("music"));
  }

  play(name: TuneName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    this.tempo = 1;
    if (!name) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.3);
    gain.connect(this.tone);
    this.current = { name, tune: TUNES[name], gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** The tune picks up a little as the run gets faster. */
  setTempo(tempo: number): void {
    this.tempo = tempo;
  }

  /** Muffles the music, as when a run is paused or has just ended. */
  muffle(on: boolean): void {
    this.tone.frequency.setTargetAtTime(on ? 700 : 5200, this.engine.now, 0.15);
  }

  fanfare(): void {
    playFanfare(this.engine, this.tone);
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // The last notes fade through the filter, so it is unhooked once they are gone.
    setTimeout(() => this.tone.disconnect(), 2000);
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const stepLength = 60 / (current.tune.bpm * this.tempo) / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      playStep(this.engine, current.gain, current.tune, current.step, current.nextAt);
      current.step = (current.step + 1) % (current.tune.lead.length * 2);
      // A little swing on the offbeat sixteenths gives the groove its bounce.
      current.nextAt += stepLength * (current.step % 2 === 1 ? 1.12 : 0.88);
    }
  }

  private fadeOut(): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.25);
    setTimeout(() => gain.disconnect(), 2000);
    this.current = null;
  }
}
