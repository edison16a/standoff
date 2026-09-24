import type { EventSource } from "@/game/engine";
import type { GameEvent } from "@/game/events";
import type { MatchPhase } from "@/shared/protocol";
import type { Tuning } from "@/shared/tuning";
import type { AudioEngine } from "./audio-engine";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";

/**
 * Decides what the match sounds like. It listens to the same event stream
 * as the renderer, so every whoosh, clang and hit lands on the frame its
 * animation starts.
 *
 * Cheers are rationed on purpose. Ordinary touches get the chime and the
 * crowd stays put. Only a clash (both jab, one parries) or a match point
 * gets a cheer, and never twice inside the cooldown, so it stays special.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly crowd: Crowd;
  private readonly music: Music;
  private lastCheerAt = -Infinity;

  constructor(
    private readonly engine: AudioEngine,
    private readonly tuning: () => Tuning,
  ) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    this.applyLevels();
  }

  applyLevels(): void {
    const { musicVolume, crowdVolume, sfxVolume } = this.tuning();
    this.engine.setLevels({ music: musicVolume, crowd: crowdVolume, sfx: sfxVolume });
  }

  onPhase(phase: MatchPhase): void {
    switch (phase) {
      case "lobby":
        this.music.play("menu");
        this.crowd.stopMurmur();
        break;
      case "enGarde":
        this.music.play("match");
        this.crowd.startMurmur();
        this.engine.holdDuck("music", 1);
        break;
      case "replay":
        // The replay is about the blades, so the music steps right back.
        this.engine.holdDuck("music", 0.2);
        break;
      case "paused":
        this.engine.holdDuck("music", 0.35);
        break;
      case "matchOver":
        this.music.play(null);
        this.engine.holdDuck("music", 1);
        this.music.fanfare();
        this.crowd.swell(4);
        this.cheer(1, true);
        break;
    }
  }

  onEvent(event: GameEvent, source: EventSource): void {
    if (source === "replay") {
      this.combat(event);
      return;
    }
    switch (event.type) {
      case "countdown":
        this.sfx.tick();
        break;
      case "allez":
        this.sfx.buzzer();
        break;
      case "touch":
        this.sfx.impact();
        this.sfx.chime();
        if (event.matchPoint) this.cheer(0.8);
        break;
      case "parried":
        this.sfx.clang();
        if (event.clash) this.cheer(0.5);
        break;
      case "double":
        this.sfx.impact();
        break;
      case "corps":
        this.sfx.buzzer();
        break;
      default:
        this.combat(event);
    }
  }

  stop(): void {
    this.music.stop();
    this.crowd.stopMurmur();
  }

  /** The effects that also play during a replay. */
  private combat(event: GameEvent): void {
    if (event.type === "jab") this.sfx.jab();
    if (event.type === "whiff") this.sfx.whiff();
    if (event.type === "parried") this.sfx.clang();
    if (event.type === "touch") this.sfx.impact();
  }

  private cheer(intensity: number, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastCheerAt < this.tuning().cheerCooldownMs) return;
    this.lastCheerAt = now;
    this.crowd.cheer(intensity);
    this.engine.duck("music", 0.45, 1.2 + intensity * 1.5);
  }
}
