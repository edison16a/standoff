import type { AudioEngine } from "@/platform/audio/audio-engine";
import { fanfare } from "./band";
import { FIGHT_SONG } from "./fight-song";
import { LOBBY_SONG } from "./lobby-song";
import type { Song } from "./score";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/** Rolls off the top so the horns stay warm and the crowd owns the highs. */
export const WARMTH_HZ = 2400;

/** Which song plays for each part of the game, and how loud. In a fight it is a bed under the crowd. */
const MOODS = {
  menu: { song: LOBBY_SONG, level: 0.9 },
  fight: { song: FIGHT_SONG, level: 0.42 },
  results: { song: LOBBY_SONG, level: 0.8 },
} as const;
export type MusicMood = keyof typeof MOODS;

export const SONGS = { lobby: LOBBY_SONG, fight: FIGHT_SONG } as const;

interface Playing {
  song: Song;
  gain: GainNode;
  step: number;
  nextAt: number;
}

/**
 * Loops one song at a time with a lookahead scheduler: a timer wakes
 * often and books every sixteenth due in the next slice on the audio
 * clock, so the groove holds while the arena is drawing. Moving between
 * songs crossfades through each song's own gain, so nothing is cut off,
 * and staying on a song only eases its level.
 */
export class Music {
  private readonly out: GainNode;
  private current: Playing | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly engine: AudioEngine) {
    const warmth = engine.ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = WARMTH_HZ;
    warmth.Q.value = 0.5;
    this.out = engine.ctx.createGain();
    this.out.connect(warmth).connect(engine.bus("music"));
  }

  play(mood: MusicMood): void {
    const { song, level } = MOODS[mood];
    const now = this.engine.now;
    if (this.current?.song === song) {
      this.current.gain.gain.cancelScheduledValues(now);
      this.current.gain.gain.setTargetAtTime(level, now, 0.6);
      return;
    }
    this.fadeOut();
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(level, now, 0.5);
    gain.connect(this.out);
    this.current = { song, gain, step: 0, nextAt: now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  fanfare(): void {
    fanfare(this.engine, this.out);
  }

  stop(): void {
    this.fadeOut();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const sixteenth = 60 / current.song.bpm / 4;
    // A tab left in the background would otherwise play every missed step at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      current.song.play(this.engine, current.gain, current.step, current.nextAt, sixteenth);
      current.step = (current.step + 1) % current.song.steps;
      current.nextAt += sixteenth;
    }
  }

  private fadeOut(): void {
    if (!this.current) return;
    const { gain } = this.current;
    gain.gain.cancelScheduledValues(this.engine.now);
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.4);
    setTimeout(() => gain.disconnect(), 3000);
    this.current = null;
  }
}
