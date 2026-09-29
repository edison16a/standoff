import type { AudioEngine } from "@/platform/audio/audio-engine";
import { LOBBY_SONG } from "./lobby-song";
import { RUN_SONG } from "./run-song";
import type { Song } from "./score";

/** The menus get the lounge tune, the run gets the hip hop beat. */
export const TUNES = { menu: LOBBY_SONG, run: RUN_SONG } as const satisfies Record<string, Song>;
export type TuneName = keyof typeof TUNES;

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/** Where the low pass sits unless a tune asks for more: warm enough to stay out of the way of the effects. */
export const OPEN_HZ = 3400;
const MUFFLED_HZ = 650;

/**
 * One looping tune at a time, booked ahead on the audio clock by a timer
 * so the beat stays tight while the page is busy drawing. Tunes fade
 * through their own gain so a switch never cuts a note off.
 */
export class Music {
  private current: { name: TuneName; song: Song; gain: GainNode; step: number; nextAt: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly tone: BiquadFilterNode;
  private tempo = 1;
  /** Where the low pass sits for the tune playing. */
  private open = OPEN_HZ;

  constructor(private readonly engine: AudioEngine) {
    this.tone = engine.ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = OPEN_HZ;
    this.tone.Q.value = 0.4;
    this.tone.connect(engine.bus("music"));
  }

  play(name: TuneName | null): void {
    if (this.current?.name === name) return;
    this.fadeOut();
    this.tempo = 1;
    if (!name) return;
    this.open = TUNES[name].open ?? OPEN_HZ;
    this.tone.frequency.setTargetAtTime(this.open, this.engine.now, 0.3);
    const gain = this.engine.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, this.engine.now, 0.3);
    gain.connect(this.tone);
    this.current = { name, song: TUNES[name], gain, step: 0, nextAt: this.engine.now + 0.1 };
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
  }

  /** The tune picks up a little as the run gets faster. */
  setTempo(tempo: number): void {
    this.tempo = tempo;
  }

  /** Muffles the music, as when a run is paused or has just ended. */
  muffle(on: boolean): void {
    this.tone.frequency.setTargetAtTime(on ? MUFFLED_HZ : this.open, this.engine.now, 0.15);
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
    const sixteenth = 60 / (current.song.bpm * this.tempo) / 4;
    // A stalled tab would otherwise try to catch up on every missed note at once.
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
    gain.gain.setTargetAtTime(0.0001, this.engine.now, 0.25);
    setTimeout(() => gain.disconnect(), 2000);
    this.current = null;
  }
}
