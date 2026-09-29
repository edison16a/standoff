import type { CharacterId } from "@/games/blade-clash/characters";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { StageFrame } from "@/games/blade-clash/engine/frames";
import { SLOTS, type PerSlot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import type { Tuning } from "@/games/blade-clash/tuning";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { Crowd } from "./crowd";
import { FrameSounds } from "./frame-sounds";
import { Music } from "./music";
import { Sfx } from "./sfx";

/** A clash this strong or more is a big one: the crowd gasps. */
const BIG_CLASH = 0.65;

/**
 * Decides what the duel sounds like. It listens to the same event stream
 * as the renderer, so every whoosh, clang and hit lands on the frame its
 * picture does, and reads every frame for the sounds that follow the
 * fighters: the energy blade's hum and the armour on each step. There is
 * no spoken voice on purpose: the music and the hall carry the mood.
 *
 * Cheers are rationed on purpose. Ordinary hits get a thump and
 * applause. Only a big clash or the final hit gets a cheer, and never
 * twice inside the cooldown, so it stays special.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly crowd: Crowd;
  private readonly music: Music;
  private readonly frames: FrameSounds;
  private readonly characters: PerSlot<CharacterId | null> = { 1: null, 2: null };
  private lastCheerAt = -Infinity;
  private afterFanfare: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly tuning: () => Tuning,
  ) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    this.frames = new FrameSounds(engine, this.sfx);
    this.applyLevels();
  }

  applyLevels(): void {
    const { musicVolume, crowdVolume, sfxVolume } = this.tuning();
    this.engine.setLevels({ music: musicVolume, crowd: crowdVolume, sfx: sfxVolume });
  }

  /** Every frame the stage draws, for the sounds that follow the fighters. */
  onFrame(frame: StageFrame): void {
    for (const slot of SLOTS) this.characters[slot] = frame.fighters.find((f) => f.slot === slot)?.characterId ?? null;
    this.frames.update(frame);
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
        this.afterFanfare = setTimeout(() => this.music.play("menu"), 5000);
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
        break;
      case "swing": {
        const character = this.characters[event.slot];
        if (character) this.sfx.whoosh(event.slot, character, Math.min(1, event.speed / 20));
        break;
      }
      case "clash":
        this.sfx.clash(SLOTS.map((slot) => this.characters[slot] ?? "knight"), event.strength);
        if (event.strength >= BIG_CLASH) this.bigClash();
        break;
      case "hit":
        this.sfx.hit(this.characters[event.attacker] ?? "knight", this.characters[event.victim] ?? "knight", event.victim);
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
    }
  }

  stop(): void {
    this.cancelFanfare();
    this.music.stop();
    this.crowd.stopMurmur();
    this.frames.stop();
    this.sfx.dispose();
  }

  private bigClash(): void {
    this.crowd.gasp();
    this.cheer(0.5);
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
