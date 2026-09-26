import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { playFanfare } from "./stings";
import { MATCH_TRACK, MENU_TRACK, type Track } from "./tracks";

export type TrackName = "menu" | "match";

const TRACKS: Record<TrackName, Track> = { menu: MENU_TRACK, match: MATCH_TRACK };
/** How often the scheduler wakes, and how far ahead it books notes. */
const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one looping track at a time. It uses the usual lookahead pattern:
 * a timer wakes often and books every note due in the next slice on the
 * audio clock, so timing stays tight even when the page is busy drawing.
 * Tracks crossfade through their own gain so switching never cuts a note.
 */
export class Music {
  private current: { name: TrackName; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly tone: BiquadFilterNode;

  constructor(private readonly engine: AudioEngine) {
    // Rounds off the raw saw and square edges into something easier to sit under, leaving the brass its bite.
    this.tone = engine.ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 4200;
    this.tone.Q.value = 0.5;
    this.tone.connect(engine.bus("music"));
  }

  play(name: TrackName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    if (!name) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.4);
    gain.connect(this.tone);
    this.current = { name, gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  fanfare(): void {
    this.dip(0.1, 4);
    playFanfare(this.engine, this.tone);
  }

  /**
   * Lowers just the loop, not the whole music bus, so a sting on top of
   * it is heard in full and never clashes with the chords underneath.
   */
  private dip(amount: number, holdS: number): void {
    const gain = this.current?.gain.gain;
    if (!gain) return;
    const now = this.engine.now;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(amount, now, 0.08);
    gain.setTargetAtTime(1, now + holdS, 0.6);
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // Let the last notes ring out, then unhook from the shared bus so no node outlives the room.
    setTimeout(() => this.tone.disconnect(), 2500);
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const track = TRACKS[current.name];
    const stepLength = 60 / track.bpm / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      track.play(this.engine, current.gain, current.step, current.nextAt);
      current.step = (current.step + 1) % track.length;
      current.nextAt += stepLength;
    }
  }

  private fadeOut(): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.3);
    setTimeout(() => gain.disconnect(), 2000);
    this.current = null;
  }
}
