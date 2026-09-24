import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { Phase } from "../protocol";
import { Announcer } from "./announcer";
import { CrowdVoice } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";

/**
 * Decides what the arena sounds like: music in the lobby and at the end,
 * the crowd through the game rising and falling with the play, a sound
 * for every event on the floor, and the announcer's calls.
 */
export class SoundDirector {
  readonly announcer = new Announcer();
  private readonly sfx: Sfx;
  private readonly crowd: CrowdVoice;
  private readonly music: Music;
  private phase: Phase | null = null;
  private oohed = false;
  private chantedAt = -99;
  private organAt = -99;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.crowd = new CrowdVoice(engine);
    this.music = new Music(engine);
    engine.setLevels({ music: 0.45, crowd: 0.8, sfx: 0.9 });
  }

  setPhase(phase: Phase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    if (phase === "lobby") {
      this.music.play(true);
      this.crowd.start();
      this.crowd.setLevel(0.15);
    } else if (phase === "countdown") {
      this.music.play(false);
      this.crowd.start();
      this.crowd.setLevel(0.45);
      this.crowd.claps(30, 2.5);
    } else if (phase === "over") {
      this.music.fanfare();
      setTimeout(() => this.phase === "over" && this.music.play(true), 3500);
    }
  }

  /** The crowd bed follows the game: louder late in the clock and at game point. */
  frame(m: Match): void {
    if (m.phase !== "live") return;
    const late = m.shotClock < 5 && m.ball.mode === "held" ? 0.25 : 0;
    const close = m.gamePoint[0] || m.gamePoint[1] ? 0.2 : 0;
    this.crowd.setLevel(0.3 + late + close);
    if (m.shotClock < 6 && m.shotClock > 4 && m.time - this.chantedAt > 20) {
      this.chantedAt = m.time;
      this.crowd.chant();
    }
  }

  event(e: MatchEvent, m: Match): void {
    switch (e.type) {
      case "countdown":
        return this.sfx.countdown(e.count);
      case "go":
        return this.sfx.go();
      case "bounce": {
        const human = m.athletes[e.id]?.seat !== null;
        return this.sfx.bounce(e.power, human ? 0.9 : 0.55);
      }
      case "floor":
        return this.sfx.bounce(Math.min(1, e.power / 5), 1);
      case "squeak":
        return this.sfx.squeak(0.8);
      case "gather":
        this.oohed = false;
        return;
      case "shot":
        if (e.three) this.crowd.setLevel(0.55);
        return;
      case "takeoff":
        return this.sfx.takeoff();
      case "land":
        return this.sfx.land(e.hard);
      case "rim":
        this.sfx.rim(e.power);
        // A ball rattling round the iron gets the whole building going "ooh".
        if (!this.oohed && m.ball.shot && !m.ball.shot.counted && m.ball.shot.kind !== "dunk") {
          this.oohed = true;
          this.crowd.ooh();
        }
        return;
      case "board":
        return this.sfx.board(e.power);
      case "net":
        return this.sfx.net(e.swish);
      case "dunk":
        this.sfx.slam(e.power);
        this.crowd.cheer(1);
        this.engine.duck("sfx", 0.8, 0.4);
        return;
      case "score":
        if (e.kind !== "dunk") this.crowd.cheer(e.points === 3 ? 0.85 : 0.55);
        if (m.time - this.organAt > 30 && e.kind !== "dunk") {
          this.organAt = m.time;
          setTimeout(() => this.music.organ(), 1400);
        }
        return;
      case "miss":
        if (m.ball.shot?.kind === "jumper" || this.oohed) this.crowd.aww();
        return;
      case "block":
        this.sfx.slap(1);
        this.crowd.cheer(0.8);
        return;
      case "steal":
      case "intercept":
        this.sfx.slap(0.6);
        this.crowd.cheer(0.5);
        return;
      case "whiff":
        return this.sfx.whoosh();
      case "pass":
        return this.sfx.pass();
      case "catch":
      case "rebound":
        return this.sfx.catch();
      case "knockdown":
        this.sfx.board(0.6);
        this.crowd.ooh();
        return;
      case "violation":
        this.sfx.horn(false);
        this.crowd.aww();
        return;
      case "onFire":
        this.crowd.cheer(0.9);
        return;
      case "win":
        this.sfx.horn(true);
        this.crowd.cheer(1);
        this.crowd.claps(60, 5);
        return;
      default:
        return;
    }
  }

  /** Called after the green of a perfect release, for the host's own chime. */
  green(): void {
    this.sfx.green();
  }

  stop(): void {
    this.music.stop();
    this.crowd.stop();
    this.announcer.stop();
  }
}
