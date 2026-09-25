import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import type { Tuning } from "@/games/blade-clash/tuning";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { RefereeVoice } from "./referee-voice";
import { Sfx } from "./sfx";

/**
 * Decides what the match sounds like. It listens to the same event stream
 * as the renderer, so every whoosh, clang and hit lands on the frame its
 * animation starts. The referee calls the bout, La Folia plays in the
 * lobby and a harpsichord ground under the match.
 *
 * Cheers are rationed on purpose. Ordinary touches get the chime and
 * polite applause. Only a clash (both jab, one parries) or a match point
 * gets a cheer, and never twice inside the cooldown, so it stays special.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly crowd: Crowd;
  private readonly music: Music;
  private readonly referee: RefereeVoice;
  private lastCheerAt = -Infinity;
  private afterFanfare: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly tuning: () => Tuning,
  ) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    // The hall hushes a little while the referee speaks.
    this.referee = new RefereeVoice(() => {
      this.engine.duck("music", 0.6, 0.9);
      this.engine.duck("crowd", 0.6, 0.9);
    });
    this.applyLevels();
  }

  applyLevels(): void {
    const { musicVolume, crowdVolume, sfxVolume } = this.tuning();
    this.engine.setLevels({ music: musicVolume, crowd: crowdVolume, sfx: sfxVolume });
  }

  onPhase(phase: MatchPhase): void {
    switch (phase) {
      case "lobby":
        this.cancelFanfare();
        this.music.play("menu");
        this.crowd.stopMurmur();
        this.engine.holdDuck("music", 1);
        break;
      case "enGarde":
        this.cancelFanfare();
        this.music.play("match");
        this.crowd.startMurmur();
        this.engine.holdDuck("music", 1);
        this.referee.call("En garde !", "En garde!");
        break;
      case "paused":
        this.engine.holdDuck("music", 0.35);
        break;
      case "matchOver":
        this.engine.holdDuck("music", 1);
        this.music.fanfare();
        this.crowd.swell(4);
        this.crowd.applause(4, 1.5);
        this.cheer(1, true);
        this.cancelFanfare();
        // Once the fanfare has rung out, the lobby's tune takes over under the results.
        this.afterFanfare = setTimeout(() => this.music.play("menu"), 4500);
        break;
    }
  }

  onEvent(event: GameEvent): void {
    switch (event.type) {
      case "countdown":
        this.sfx.tick();
        if (event.remaining === 1) this.referee.call("Prêts ?", "Ready?");
        break;
      case "allez":
        this.sfx.buzzer();
        this.referee.call("Allez !", "Allez!", 1.1);
        break;
      case "touch":
        // The music drops away for the slow motion, and comes back with the burst.
        this.sfx.impact();
        this.engine.duck("music", 0.15, 1.1);
        this.referee.call("Touché !", "Touché!");
        if (event.matchPoint) this.cheer(0.8);
        break;
      case "impact":
        this.sfx.impact();
        this.sfx.chime();
        this.crowd.applause();
        break;
      case "parry":
        this.sfx.parry();
        break;
      case "parried":
        this.sfx.clang();
        if (event.clash) {
          this.crowd.gasp();
          this.cheer(0.5);
        }
        break;
      case "double":
        this.sfx.impact();
        this.referee.call("Coup double !", "Double touch!");
        break;
      case "corps":
        this.sfx.buzzer();
        this.referee.call("Halte ! Corps à corps.", "Halt! Body contact.");
        break;
      case "jab":
        this.sfx.jab();
        break;
      case "whiff":
        this.sfx.whiff();
        break;
      case "matchWon":
        this.referee.call("Victoire !", "Victory!");
        break;
    }
  }

  stop(): void {
    this.cancelFanfare();
    this.music.stop();
    this.crowd.stopMurmur();
    this.referee.stop();
    this.sfx.dispose();
  }

  private cancelFanfare(): void {
    if (this.afterFanfare) clearTimeout(this.afterFanfare);
    this.afterFanfare = null;
  }

  private cheer(intensity: number, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastCheerAt < this.tuning().cheerCooldownMs) return;
    this.lastCheerAt = now;
    this.crowd.cheer(intensity);
    this.engine.duck("music", 0.45, 1.2 + intensity * 1.5);
  }
}
