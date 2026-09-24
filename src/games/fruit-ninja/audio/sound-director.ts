import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import { KINDS } from "../engine/fruit-kinds";
import { FuseHiss } from "./fuse";
import { Sfx } from "./sfx";

/** At most this many whooshes a second, so four players swiping never turns into a roar. */
const WHOOSH_GAP_S = 0.06;

/**
 * Decides what the game sounds like. It hears every game event and plays
 * the matching sound, placed left or right by where it happened.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly fuse: FuseHiss;
  private lastWhoosh = 0;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.fuse = new FuseHiss(engine);
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
          break;
        case "score":
          if (event.reason === "combo") this.sfx.combo(event.count ?? 3);
          break;
        case "phase":
          if (event.phase === "playing") this.sfx.count(true);
          if (event.phase === "ending") this.sfx.gong();
          if (event.phase === "over") this.sfx.fanfare();
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
    this.fuse.stop();
  }
}
