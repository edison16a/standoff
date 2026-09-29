import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import { Music } from "./music";
import { Sfx } from "./sfx";

/**
 * The mix in the lobby, and under a match where the ball comes first.
 * There is no crowd bus in use: synthesised crowds sounded like wind, so
 * the music sits a touch higher to fill the space they left.
 */
const LOBBY_LEVELS = { music: 0.6, crowd: 0, sfx: 0.9 };
const MATCH_LEVELS = { music: 0.38, crowd: 0, sfx: 0.95 };

/**
 * Turns the match into sound: a slow bossa in the lobby and a sunny
 * stadium anthem under the match, and every event with its effect. There is no
 * commentary and no crowd: the whistle, the horn and the music carry the
 * big moments.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  readonly music: Music;
  private later: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.music = new Music(engine);
    engine.setLevels(LOBBY_LEVELS);
  }

  /** The lobby: the beach tune. */
  lobby(): void {
    this.cancelLater();
    this.engine.setLevels(LOBBY_LEVELS);
    this.music.play("lobby");
  }

  matchStart(): void {
    this.cancelLater();
    this.engine.setLevels(MATCH_LEVELS);
    this.music.play("play");
  }

  event(event: MatchEvent): void {
    switch (event.type) {
      case "whistle":
        this.sfx.whistle(event.long ? "fulltime" : "kickoff");
        break;
      case "foul":
        this.sfx.whistle("foul");
        break;
      case "setpiece":
        this.sfx.whistle("setpiece");
        break;
      case "block":
        this.sfx.block(event.speed);
        break;
      case "steal":
        this.sfx.tackle(event.won);
        break;
      case "pass":
        // A lofted ball is struck with the laces, so it sounds like a soft kick.
        if (event.air) this.sfx.kick(0.3);
        else this.sfx.pass();
        break;
      case "shot":
        this.sfx.kick(event.power);
        break;
      case "goal": {
        this.sfx.horn();
        this.music.goalSting();
        break;
      }
      case "save":
        this.sfx.catch();
        break;
      case "woodwork":
        this.sfx.post(event.speed);
        break;
      case "net":
        if (event.speed > 2) this.sfx.net(event.speed);
        break;
      case "board":
        this.sfx.board(event.speed);
        break;
      case "bounce":
        this.sfx.bounce(event.speed);
        break;
      case "slide":
        this.sfx.slide();
        break;
      case "skill":
        // A soft touch on the ball as the move starts.
        this.sfx.bounce(3);
        break;
      case "tackle":
        this.sfx.tackle(event.won);
        break;
      case "fulltime":
        this.music.fanfare();
        this.cancelLater();
        // The results get the beach tune back once the fanfare has rung out.
        this.later = setTimeout(() => {
          this.later = null;
          this.engine.setLevels(LOBBY_LEVELS);
          this.music.play("lobby");
        }, 4500);
        break;
      case "miss":
      case "skillResult":
      case "golden":
      case "kickoff":
      case "out":
      case "throw":
      case "control":
      case "stumble":
      case "card":
      case "jump":
        break;
    }
  }

  firework(): void {
    this.sfx.firework();
  }

  private cancelLater(): void {
    if (this.later) clearTimeout(this.later);
    this.later = null;
  }

  stop(): void {
    this.cancelLater();
    this.music.stop();
    this.sfx.dispose();
  }
}
