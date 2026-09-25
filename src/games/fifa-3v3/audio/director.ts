import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { TEAMS } from "../teams";
import { Announcer } from "./announcer";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/**
 * Turns the match into sound: every event gets its effect, the crowd
 * reacts and follows the play, and the announcer calls the big moments.
 * `nameOf` gives a player's name as it should be called out.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  readonly crowd: Crowd;
  readonly music: Music;
  private readonly announcer = new Announcer();
  private kickoffs = 0;

  constructor(private readonly engine: AudioEngine, private readonly nameOf: (athlete: number) => string) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    engine.setLevels({ music: 0.55, crowd: 0.7, sfx: 0.9 });
  }

  /** The lobby: a groove and a quiet crowd. */
  lobby(): void {
    this.crowd.start();
    this.crowd.setLevel(0.1);
    this.music.startGroove();
  }

  matchStart(): void {
    this.music.stopGroove();
    this.crowd.start();
    // Every match opens with the call, Play again included.
    this.kickoffs = 0;
  }

  /** Every frame: the crowd rises as the ball nears a goal. */
  frame(view: MatchView, dt: number): void {
    const near = Math.max(0, (Math.abs(view.ball.x) - 7) / 9);
    const level = view.phase === "goal" ? 0.9 : view.phase === "fulltime" ? 0.8 : 0.18 + 0.5 * near;
    this.crowd.setLevel(level);
    this.crowd.frame(dt, view.phase === "play");
  }

  private call(text: string, urgent = true, pitch = 1): void {
    this.announcer.say(text, { urgent, pitch });
    this.engine.duck("crowd", 0.6, 1.4);
  }

  event(event: MatchEvent): void {
    switch (event.type) {
      case "whistle":
        this.sfx.whistle(event.long, event.long ? 3 : 1);
        break;
      case "kickoff":
        if (this.kickoffs++ === 0) this.call("Here we go!", false);
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
        this.engine.duck("music", 0.7, 3);
        const name = event.scorer !== null ? this.nameOf(event.scorer) : "";
        if (event.golden) this.call(`Golden goal! ${name} wins it!`, true, 1.1);
        else this.call(name ? `Goal! ${name}!` : pick(["Goal!", "It's in!"]), true, 1.1);
        break;
      }
      case "save":
        this.sfx.catch();
        if (event.kind === "claim") break;
        this.crowd.ooh();
        this.crowd.applause(1.5);
        this.call(pick(event.kind === "parry" ? ["What a save!", "Pushed away!", "Great stop!"] : ["What a save!", "Safe hands!", "Great save!"]));
        break;
      case "woodwork":
        this.sfx.post(event.speed);
        this.crowd.ooh();
        this.call(event.part === "post" ? "Off the post!" : "Off the bar!");
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
        if (event.kind === "over") this.call(pick(["Over the bar!", "Blazed over!"]), false);
        else this.call(pick(["Just wide!", "Wide of the post!"]), false);
        break;
      case "slide":
        this.sfx.slide();
        break;
      case "tackle":
        this.sfx.tackle(event.won);
        if (event.won && event.victim !== null) {
          this.crowd.roar(0.25);
          if (Math.random() < 0.3) this.call(pick(["Great tackle!", "Won it back!"]), false);
        }
        break;
      case "golden":
        this.call("Golden goal! Next goal wins!", true);
        this.crowd.roar(0.6);
        break;
      case "fulltime":
        this.crowd.roar(1);
        this.crowd.applause(4);
        this.music.fanfare();
        if (event.winner !== null) this.call(`Full time! ${TEAMS[event.winner].name} win!`, true);
        break;
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

  stop(): void {
    this.music.stopGroove();
    this.crowd.stop();
    this.announcer.stop();
  }
}
