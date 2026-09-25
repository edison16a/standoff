import type { SoundDirector } from "../audio/sound-director";
import type { SongSync } from "./round";

/**
 * The clock every run keeps to: seconds since the top of the song, read
 * from the page's own clock and lined up with the audio clock whenever the
 * song starts. The picture waits out the audio's output delay, so what is
 * seen lands with what is heard.
 */
export class SongClock implements SongSync {
  private origin = performance.now() / 1000;

  constructor(
    private readonly sound: SoundDirector,
    private readonly song: () => { id: string; bpm: number },
  ) {}

  songTime(): number {
    return performance.now() / 1000 - this.origin;
  }

  /** The song time at a moment on the page's clock, in milliseconds, like an event's time stamp. */
  songTimeAt(pageMs: number): number {
    return pageMs / 1000 - this.origin;
  }

  restart(levelTime: number, lead: number): void {
    const { id, bpm } = this.song();
    this.origin = performance.now() / 1000 + lead - levelTime;
    // Booked a little early by the output delay, so it is heard exactly on time.
    const at = this.sound.audioNow + lead - this.sound.latency;
    this.sound.music.play(id, (levelTime * bpm) / 60, at);
  }

  /** Starts the clock without music, for silent waits. */
  hold(levelTime: number, lead: number): void {
    this.origin = performance.now() / 1000 + lead - levelTime;
  }
}
