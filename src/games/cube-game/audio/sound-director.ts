import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { PlayerEvent } from "../engine/player";
import { Music } from "./music";
import { Sfx } from "./sfx";

/**
 * Everything the game hears, in one place: the songs and the effects.
 * The session tells it what happened; it decides what that sounds like.
 * With two players, effects are softer so two runs do not turn to noise.
 */
export class SoundDirector {
  readonly music: Music;
  readonly sfx: Sfx;
  private players = 1;

  constructor(private readonly engine: AudioEngine) {
    this.music = new Music(engine);
    this.sfx = new Sfx(engine);
  }

  /** Seconds between the audio clock and what is heard, so pictures can wait for the sound. */
  get latency(): number {
    const ctx = this.engine.ctx;
    return (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
  }

  get audioNow(): number {
    return this.engine.now;
  }

  setPlayers(players: number): void {
    this.players = players;
  }

  /** Plays what a player's run just did. */
  event(event: PlayerEvent): void {
    switch (event.type) {
      case "jump":
        if (this.players === 1) this.sfx.jump();
        break;
      case "flap":
        this.sfx.flap();
        break;
      case "flip":
        this.sfx.flip(event.gravity === -1);
        break;
      case "pad":
        this.sfx.pad();
        break;
      case "orb":
        this.sfx.orb();
        break;
      case "portal":
        this.sfx.portal();
        break;
      case "speed":
        this.sfx.speed(event.faster);
        break;
      case "death":
        this.sfx.death();
        break;
      case "finish":
        this.sfx.fanfare();
        break;
      case "checkpoint":
        this.sfx.checkpoint();
        break;
      default:
    }
  }

  dispose(): void {
    this.music.dispose();
    this.sfx.dispose();
  }
}
