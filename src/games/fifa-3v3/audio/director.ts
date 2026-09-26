import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";

/** The mix in the lobby, and under a match where the crowd and the ball come first. */
const LOBBY_LEVELS = { music: 0.55, crowd: 0.7, sfx: 0.9 };
const MATCH_LEVELS = { music: 0.32, crowd: 0.75, sfx: 0.9 };

/**
 * Turns the match into sound: a bossa tune in the lobby and an afro house
 * groove under the match, every event with its effect, the crowd reacting
 * and following the play. There is no spoken commentary: the crowd,
 * the whistle and the music carry the big moments.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  readonly crowd: Crowd;
  readonly music: Music;
  private later: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    engine.setLevels(LOBBY_LEVELS);
  }

  /** The lobby: the beach tune and a quiet crowd. */
  lobby(): void {
    this.cancelLater();
    this.engine.setLevels(LOBBY_LEVELS);
    this.crowd.start();
    this.crowd.setLevel(0.1);
    this.music.play("lobby");
  }

  matchStart(): void {
    this.cancelLater();
    this.engine.setLevels(MATCH_LEVELS);
    this.music.play("play");
    this.crowd.start();
  }

  /** Every frame: the crowd rises as the ball nears a goal. */
  frame(view: MatchView, dt: number): void {
    const near = Math.max(0, (Math.abs(view.ball.x) - 7) / 9);
    const level = view.phase === "goal" ? 0.9 : view.phase === "fulltime" ? 0.8 : 0.18 + 0.5 * near;
    this.crowd.setLevel(level);
    this.crowd.frame(dt, view.phase === "play");
  }

  event(event: MatchEvent): void {
    switch (event.type) {
      case "whistle":
        this.sfx.whistle(event.long, event.long ? 3 : 1);
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
        this.crowd.roar(1);
        this.sfx.horn();
        this.music.goalSting();
        break;
      }
      case "save":
        this.sfx.catch();
        if (event.kind === "claim") break;
        this.crowd.ooh();
        this.crowd.applause(1.5);
        break;
      case "woodwork":
        this.sfx.post(event.speed);
        this.crowd.ooh();
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
      case "miss":
        this.crowd.groan();
        break;
      case "slide":
        this.sfx.slide();
        break;
      case "skill":
        // A soft touch on the ball as the move starts.
        this.sfx.bounce(3);
        break;
      case "skillResult":
        if (event.result === "beat") {
          this.crowd.ooh();
          this.crowd.roar(0.3);
        } else this.crowd.groan();
        break;
      case "tackle":
        this.sfx.tackle(event.won);
        if (event.won && event.victim !== null) {
          this.crowd.roar(0.25);
        }
        break;
      case "golden":
        this.crowd.roar(0.6);
        break;
      case "fulltime":
        this.crowd.roar(1);
        this.crowd.applause(4);
        this.music.fanfare();
        this.cancelLater();
        // The results get the beach tune back once the fanfare has rung out.
        this.later = setTimeout(() => {
          this.later = null;
          this.engine.setLevels(LOBBY_LEVELS);
          this.music.play("lobby");
        }, 4500);
        break;
      case "kickoff":
      case "out":
      case "throw":
      case "control":
      case "stumble":
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
    this.crowd.stop();
    this.sfx.dispose();
  }
}
