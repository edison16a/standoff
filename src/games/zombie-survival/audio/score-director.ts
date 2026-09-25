import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Phase } from "../engine/events";
import { LoopMusic } from "./loop-music";
import { lastLight, SAFEHOUSE } from "./score";

/**
 * Picks the music for the moment: the safehouse tune in the lobby, the
 * road tune through a run, pushed harder while a fight is on, and
 * silence for the two endings so their stingers speak alone.
 */
export class ScoreDirector {
  private readonly music: LoopMusic;
  private fighting = false;
  private readonly road = lastLight(() => (this.fighting ? 1 : 0));

  constructor(engine: AudioEngine) {
    // A low cutoff: the score is the room tone of a dead city, never the loudest thing in it.
    this.music = new LoopMusic(engine, 2200);
    this.lobby();
  }

  lobby(): void {
    this.fighting = false;
    this.music.play(SAFEHOUSE, 3);
  }

  phase(phase: Phase): void {
    switch (phase) {
      case "lobby":
        return this.lobby();
      case "down":
      case "escaped":
        this.fighting = false;
        this.music.play(null);
        return;
      default:
        this.fighting = phase === "fight";
        this.music.play(this.road, 1.5);
    }
  }

  /** Makes room for a boss's arrival, a checkpoint or a radio call. */
  dip(amount: number, holdS: number): void {
    this.music.dip(amount, holdS);
  }

  stop(): void {
    this.music.stop();
  }
}
