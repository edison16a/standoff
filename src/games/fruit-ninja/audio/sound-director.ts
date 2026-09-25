import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent, MatchPhase } from "../engine/events";
import { KINDS } from "../engine/fruit-kinds";
import { applause, cheer } from "./crowd";
import { DOJO, GARDEN } from "./dojo-tunes";
import { FuseHiss } from "./fuse";
import { LoopMusic } from "./loop-music";
import { Sfx } from "./sfx";

/** At most this many whooshes a second, so four players swiping never turns into a roar. */
const WHOOSH_GAP_S = 0.06;
/** How long the winners' fanfare and cheer get before the lobby music comes back. */
const CELEBRATE_MS = 5000;

/**
 * Decides what the game sounds like. It hears every game event and plays
 * the matching sound, placed left or right by where it happened. The
 * garden tune plays in the lobby and the dojo groove through a round,
 * and the watching crowd cheers the big combos and the winners.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly fuse: FuseHiss;
  private readonly music: LoopMusic;
  private lastWhoosh = 0;
  private backToLobby: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.fuse = new FuseHiss(engine);
    this.music = new LoopMusic(engine, 2800);
    engine.setLevels({ music: 0.55, crowd: 0.6, sfx: 0.9 });
    this.lobby();
  }

  lobby(): void {
    this.clearTimer();
    this.music.play(GARDEN, 2.5);
  }

  /** The countdown starts: the garden fades so the beeps and the first beat land clean. */
  roundStarting(): void {
    this.clearTimer();
    this.music.play(null);
  }

  react(events: readonly MatchEvent[], halfWidth: number): void {
    const pan = (x: number) => x / Math.max(1, halfWidth);
    for (const event of events) {
      switch (event.type) {
        case "swipe":
          if (this.engine.now - this.lastWhoosh > WHOOSH_GAP_S) {
            this.lastWhoosh = this.engine.now;
            this.sfx.whoosh(pan(event.at.x), event.speed);
          }
          break;
        case "slice":
          this.sfx.slice(pan(event.body.x), event.body.radius);
          if (KINDS[event.body.kind].class === "rare") this.sfx.chime(pan(event.body.x));
          break;
        case "hit":
          this.sfx.thunk(pan(event.body.x));
          break;
        case "burst":
          this.sfx.burst(pan(event.body.x));
          break;
        case "bomb":
          this.sfx.explosion(pan(event.body.x));
          this.engine.duck("music", 0.3, 1.2);
          break;
        case "score":
          if (event.reason === "combo") this.combo(event.count ?? 3, pan(event.at.x));
          break;
        case "phase":
          this.phase(event.phase);
          break;
      }
    }
  }

  /** A beep for 3, 2 and 1. */
  countdown(): void {
    this.sfx.count(false);
  }

  /** Keeps the fuse hiss in step with the bombs in the air. */
  bombs(count: number): void {
    this.fuse.set(count);
  }

  stop(): void {
    this.clearTimer();
    this.fuse.stop();
    this.music.stop();
  }

  /** Rising notes for every combo, and from four fruit up the crowd joins in. */
  private combo(count: number, pan: number): void {
    this.sfx.combo(count);
    if (count >= 4) cheer(this.engine, this.engine.bus("crowd"), this.engine.now + 0.1, { size: Math.min(0.8, count * 0.12), length: 1.6, pan: pan * 0.5 });
  }

  private phase(phase: MatchPhase): void {
    switch (phase) {
      case "playing":
        this.sfx.count(true);
        this.music.play(DOJO, 0.3);
        return;
      case "ending":
        this.sfx.gong();
        this.music.play(null);
        return;
      case "over": {
        this.sfx.fanfare();
        const crowd = this.engine.bus("crowd");
        cheer(this.engine, crowd, this.engine.now + 0.2, { size: 1, length: 3.4 });
        applause(this.engine, crowd, this.engine.now + 0.5, 4.5);
        this.clearTimer();
        this.backToLobby = setTimeout(() => this.lobby(), CELEBRATE_MS);
        return;
      }
      default:
        return;
    }
  }

  private clearTimer(): void {
    if (this.backToLobby) clearTimeout(this.backToLobby);
    this.backToLobby = null;
  }
}
