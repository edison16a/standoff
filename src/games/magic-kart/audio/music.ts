import type { AudioEngine } from "@/platform/audio/audio-engine";
import { playFanfare } from "./fanfare";
import { LOBBY_SONG } from "./lobby-song";
import { RACE_SONG } from "./race-song";
import type { Song } from "./song";

const SONGS = { lobby: LOBBY_SONG, race: RACE_SONG } satisfies Record<string, Song>;
export type SongName = keyof typeof SONGS;

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Plays one looping song at a time with the usual lookahead scheduler:
 * a timer wakes often and books every note due in the next slice on the
 * audio clock, so the beat stays tight while the page is busy drawing.
 * Songs crossfade through their own gain so a switch never cuts a note.
 */
export class Music {
  private current: { name: SongName; song: Song; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly tone: BiquadFilterNode;
  /** Speeds the song up a touch on the final lap. */
  private tempo = 1;
  /** 0 for a normal lap, 1 for the final lap's fuller arrangement. */
  private intensity = 0;

  constructor(private readonly engine: AudioEngine) {
    // Rounds off the saw edges so the music sits under the engines.
    this.tone = engine.ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 2800;
    this.tone.Q.value = 0.5;
    this.tone.connect(engine.bus("music"));
  }

  play(name: SongName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    this.tempo = 1;
    this.intensity = 0;
    if (!name) return;
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.3);
    gain.connect(this.tone);
    this.current = { name, song: SONGS[name], gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** The final lap: a little faster and a fuller band, picked up on the next sixteenth. */
  finalLap(): void {
    this.tempo = 1.05;
    this.intensity = 1;
  }

  fanfare(): void {
    playFanfare(this.engine, this.tone);
  }

  stop(): void {
    this.play(null);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const current = this.current;
    if (!current) return;
    const { song } = current;
    const sixteenth = 60 / (song.bpm * this.tempo) / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
    if (current.nextAt < this.engine.now - 0.5) current.nextAt = this.engine.now + 0.05;
    while (current.nextAt < this.engine.now + LOOKAHEAD_S) {
      const swing = current.step % 2 === 1 ? song.swing * sixteenth : 0;
      song.play(this.engine, current.gain, current.step, current.nextAt + swing, this.intensity);
      current.step = (current.step + 1) % song.steps;
      current.nextAt += sixteenth;
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
