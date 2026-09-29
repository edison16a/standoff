import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import { Music } from "./music";
import { Sfx } from "./sfx";

/**
 * The mix in the lobby, and under a game where the field comes first.
 * The crowd bus stays silent: a synthesised crowd only sounds like wind,
 * so the music sits a touch higher to fill the space it left.
 */
const LOBBY_LEVELS = { music: 0.6, crowd: 0, sfx: 0.9 };
const GAME_LEVELS = { music: 0.4, crowd: 0, sfx: 0.95 };

/**
 * Turns the game into sound: the tailgate groove in the lobby, the
 * broadcast theme under the game, and every event with its effect.
 * There is no commentary and no crowd: the whistle, the horn, the pads
 * and the brass carry the big moments.
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

  lobby(): void {
    this.cancelLater();
    this.engine.holdDuck("music", 1);
    this.engine.setLevels(LOBBY_LEVELS);
    this.music.play("lobby");
  }

  gameStart(): void {
    this.cancelLater();
    this.engine.setLevels(GAME_LEVELS);
    this.music.play("game");
  }

  /** Into the replay: the broadcast swoosh, and the theme steps back for the slow motion. */
  replayIn(): void {
    this.sfx.swoosh();
    this.engine.holdDuck("music", 0.45);
  }

  replayOut(): void {
    this.sfx.swoosh();
    this.engine.holdDuck("music", 1);
  }

  event(event: MatchEvent): void {
    const { sfx, music } = this;
    switch (event.type) {
      case "hike":
        return sfx.snap();
      case "pads":
        return sfx.pads(event.power);
      case "juke":
        return sfx.cut();
      case "dive":
      case "lunge":
        return sfx.whoosh();
      case "missedTackle":
        return sfx.turf(undefined, 0.5);
      case "tackle":
        return sfx.tackle(event.sack);
      case "throw":
        return sfx.throwBall(event.speed);
      case "catch":
        return sfx.catchBall();
      case "intercept":
        sfx.catchBall();
        return music.sting("sink");
      case "incomplete":
      case "breakUp":
        return sfx.bounce();
      case "whistle":
        return sfx.whistle(event.end === "touchdown" || event.end === "safety" ? "score" : "dead");
      case "firstDown":
        return sfx.chime();
      case "turnoverOnDowns":
        return music.sting("sink");
      case "meter":
        return sfx.tick(event.stage === "aim" ? Math.abs(event.value) <= 0.12 : event.value > 0.6);
      case "kick":
        return sfx.kick(event.power, !event.fieldGoal);
      case "fieldGoal":
        return event.good ? music.sting("goodKick") : music.sting("sink");
      case "touchdown":
        if (event.conversion) return music.sting("goodKick");
        sfx.horn();
        return music.sting("touchdown", 0.15, 3.5);
      case "safety":
        return music.sting("sink");
      case "quarterEnd":
        sfx.whistle("quarter");
        return music.sting("bumper");
      case "overtime":
        return music.sting("bumper");
      case "win":
        return this.final();
      default:
        return;
    }
  }

  /** The final whistle: the fanfare, then the tailgate groove back for the results. */
  private final(): void {
    this.music.sting("fanfare", 0.1, 4);
    this.cancelLater();
    this.later = setTimeout(() => {
      this.later = null;
      this.engine.setLevels(LOBBY_LEVELS);
      this.music.play("lobby");
    }, 4500);
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
