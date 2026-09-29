import type { AudioEngine } from "@/platform/audio/audio-engine";
import { GAME_SONG } from "./game-song";
import { LOBBY_SONG } from "./lobby-song";
import type { Song } from "./score";
import { trophyLift, winnersFanfare } from "./stings";

/** The lobby and results get the late night tune, the game gets the arena song. */
export const TUNES = { lobby: LOBBY_SONG, play: GAME_SONG } as const satisfies Record<string, Song>;
export type TuneName = keyof typeof TUNES;

/** Rolls off the top so the band sounds like the arena's speakers, never harsh. */
export const WARMTH_HZ = 2400;

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one looping tune at a time with the usual lookahead scheduler:
 * a timer wakes often and books every note due in the next slice on the
 * audio clock, so the beat stays tight while the page is busy drawing.
 * Tunes crossfade through their own gain so a switch never cuts a note.
 */
export class Music {
  private current: { name: TuneName; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly warmth: BiquadFilterNode;

  constructor(private readonly engine: AudioEngine) {
    this.warmth = engine.ctx.createBiquadFilter();
    this.warmth.type = "lowpass";
    this.warmth.frequency.value = WARMTH_HZ;
    this.warmth.Q.value = 0.5;
    this.warmth.connect(engine.bus("music"));
  }

  play(name: TuneName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    if (!name) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.5);
    gain.connect(this.warmth);
    this.current = { name, gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** The trophy going up, with the loop stepping aside for it. */
  lift(): void {
    this.dip(0.12, 4);
    trophyLift(this.engine, this.warmth);
  }

  /** A brass fanfare for the winners, with the loop stepping aside for it. */
  fanfare(): void {
    this.dip(0.15, 3);
    winnersFanfare(this.engine, this.warmth);
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
    setTimeout(() => this.warmth.disconnect(), 2500);
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const song = TUNES[current.name];
    const sixteenth = 60 / song.bpm / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      song.play(this.engine, current.gain, current.step, current.nextAt, sixteenth);
      current.step = (current.step + 1) % song.steps;
      current.nextAt += sixteenth;
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
