import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import type { Tuning } from "@/games/blade-clash/tuning";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { Announcer } from "./announcer";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";

/** A clash this strong or more is a big one: the crowd gasps and the announcer says so. */
const BIG_CLASH = 0.65;
/** The announcer calls a big clash at most this often. */
const CLASH_CALL_GAP_MS = 6000;

/**
 * Decides what the duel sounds like. It listens to the same event stream
 * as the renderer, so every whoosh, clang and hit lands on the frame its
 * picture does. The announcer calls the start, the big clashes and the
 * winner.
 *
 * Cheers are rationed on purpose. Ordinary hits get a thump and
 * applause. Only a big clash or the final hit gets a cheer, and never
 * twice inside the cooldown, so it stays special.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly crowd: Crowd;
  private readonly music: Music;
  private readonly announcer: Announcer;
  private lastCheerAt = -Infinity;
  private lastClashCallAt = -Infinity;
  private afterFanfare: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly tuning: () => Tuning,
  ) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    // The hall hushes a little while the announcer speaks.
    this.announcer = new Announcer(() => {
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
      case "countdown":
        this.cancelFanfare();
        this.music.play("match");
        this.crowd.startMurmur();
        this.engine.holdDuck("music", 1);
        this.announcer.say("Blades ready!");
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
        break;
      case "fight":
        this.sfx.gong();
        this.announcer.say("Fight!", 1.1);
        break;
      case "swing":
        this.sfx.whoosh(Math.min(1, event.speed / 20));
        break;
      case "clash":
        this.sfx.clang(event.strength);
        if (event.strength >= BIG_CLASH) this.bigClash();
        break;
      case "hit":
        this.sfx.impact();
        if (!event.final) {
          this.crowd.applause(1.2, 0.6);
          break;
        }
        // The music drops away for the slow motion, and comes back with the burst.
        this.engine.duck("music", 0.15, 1.3);
        this.crowd.gasp();
        break;
      case "finish":
        this.sfx.impact();
        this.sfx.chime();
        this.cheer(1, true);
        break;
      case "matchWon":
        this.announcer.say(event.winner === 1 ? "Player one wins!" : "Player two wins!");
        break;
    }
  }

  stop(): void {
    this.cancelFanfare();
    this.music.stop();
    this.crowd.stopMurmur();
    this.announcer.stop();
    this.sfx.dispose();
  }

  private bigClash(): void {
    this.crowd.gasp();
    this.cheer(0.5);
    const now = performance.now();
    if (now - this.lastClashCallAt < CLASH_CALL_GAP_MS) return;
    this.lastClashCallAt = now;
    this.announcer.say("What a clash!", 1.15);
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
