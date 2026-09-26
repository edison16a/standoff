import { CHARACTERS, type CharacterId } from "@/games/blade-clash/characters";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { StageFrame } from "@/games/blade-clash/engine/frames";
import { SLOTS, type PerSlot, type Slot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import type { Tuning } from "@/games/blade-clash/tuning";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { Announcer } from "./announcer";
import { Crowd } from "./crowd";
import { FrameSounds } from "./frame-sounds";
import { Music } from "./music";
import { Sfx } from "./sfx";

/** A clash this strong or more is a big one: the crowd gasps and the announcer says so. */
const BIG_CLASH = 0.65;
/** The announcer calls a big clash at most this often. */
const CLASH_CALL_GAP_MS = 6000;
const CLASH_CALLS = ["What a clash!", "Steel on steel!", "Blocked!", "Huge clash!"];

/**
 * Decides what the duel sounds like. It listens to the same event stream
 * as the renderer, so every whoosh, clang and hit lands on the frame its
 * picture does, and reads every frame for the sounds that follow the
 * fighters: the energy blade's hum and the armour on each step. The
 * announcer calls the start, the big clashes and the winner.
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
  private readonly frames: FrameSounds;
  private readonly characters: PerSlot<CharacterId | null> = { 1: null, 2: null };
  private lastCheerAt = -Infinity;
  private lastClashCallAt = -Infinity;
  private clashCall = 0;
  private afterFanfare: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly tuning: () => Tuning,
    /** What each player is called, so the announcer can crown the winner by name. */
    private readonly name: (slot: Slot) => string = (slot) => `Player ${slot}`,
  ) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    this.frames = new FrameSounds(engine, this.sfx);
    // The arena hushes a little while the announcer speaks.
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
        this.announcer.say(this.matchup());
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
        this.announcer.say("Fight!", 1.1);
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
      case "matchWon":
        this.announcer.say(`${this.name(event.winner)} wins!`);
        break;
    }
  }

  stop(): void {
    this.cancelFanfare();
    this.music.stop();
    this.crowd.stopMurmur();
    this.announcer.stop();
    this.frames.stop();
    this.sfx.dispose();
  }

  /** The call as a fight starts: who faces whom, or just a call to arms. */
  private matchup(): string {
    const [a, b] = [this.characters[1], this.characters[2]];
    return a && b ? `${CHARACTERS[a].name} against ${CHARACTERS[b].name}. Blades ready!` : "Blades ready!";
  }

  private bigClash(): void {
    this.crowd.gasp();
    this.cheer(0.5);
    const now = performance.now();
    if (now - this.lastClashCallAt < CLASH_CALL_GAP_MS) return;
    this.lastClashCallAt = now;
    this.announcer.say(CLASH_CALLS[this.clashCall++ % CLASH_CALLS.length]!, 1.15);
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
