import { Autoplay } from "../engine/autoplay";
import type { Level } from "../engine/types";
import { levelById } from "../levels";
import type { DrawPlayer } from "../render/game-renderer";

/** How long a finished demo run holds before it goes round again, in seconds. */
const LOOP_HOLD = 1.5;

/**
 * The computer's run of the chosen level behind the menus and the camera
 * steps. It goes round again a moment after every finish.
 */
export class MenuDemo {
  private play: Autoplay;
  private restarted = true;

  constructor(levelId: string) {
    this.play = new Autoplay(levelById(levelId));
  }

  get level(): Level {
    return this.play.level;
  }

  /** A different level, from its start. */
  load(levelId: string): void {
    this.play = new Autoplay(levelById(levelId));
    this.restarted = true;
  }

  /** The same level from its start. */
  restart(): void {
    this.play.restart();
    this.restarted = true;
  }

  /**
   * The run up to a song time, ready to draw. `looped` says it just went
   * round again, so the song can start over with it.
   */
  frame(time: number): { player: DrawPlayer; looped: boolean } {
    const events = this.play.advanceTo(time);
    const looped = this.play.run.finished && time > this.play.run.time + LOOP_HOLD;
    if (looped) this.restart();
    const restarted = this.restarted;
    this.restarted = false;
    // The computer's run counts no attempts, so it shows no counter.
    return { player: { state: this.play.run.player, events, attempt: 0, restarted }, looped };
  }
}
