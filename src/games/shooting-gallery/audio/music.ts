import type { AudioEngine } from "@/platform/audio/audio-engine";
import { playFanfare, POLKA, WALTZ, type Track } from "./tunes";

export type TuneName = "waltz" | "polka";

const TRACKS: Record<TuneName, Track> = { waltz: WALTZ, polka: POLKA };
/** How often the scheduler wakes, and how far ahead it books notes. */
const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one looping tune at a time with the usual lookahead pattern: a
 * timer wakes often and books every note due in the next slice on the
 * audio clock, so the beat stays steady even while the page draws.
 * Tunes fade through their own gain so switching never cuts a note.
 */
export class Music {
  private current: { name: TuneName; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly out: BiquadFilterNode;

  constructor(private readonly engine: AudioEngine) {
    // Takes the edge off the square pipes so the tune sits under the shots.
    this.out = engine.ctx.createBiquadFilter();
    this.out.type = "lowpass";
    this.out.frequency.value = 3400;
    this.out.connect(engine.bus("music"));
  }

  play(name: TuneName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    if (!name) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.25);
    gain.connect(this.out);
    this.current = { name, gain, step: 0, nextAt: this.engine.now + 0.08 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  fanfare(): void {
    playFanfare(this.engine, this.out);
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const track = TRACKS[current.name];
    // A page left in the background falls behind. Skip ahead rather than play a burst of stale notes.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      track.play(this.engine, current.gain, current.step, current.nextAt);
      current.step = (current.step + 1) % track.length;
      current.nextAt += track.step;
    }
  }

  private fadeOut(): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.2);
    setTimeout(() => gain.disconnect(), 1500);
    this.current = null;
  }
}
