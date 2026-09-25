import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import { isHeavyKey } from "../engine/moves";
import type { StageId } from "../engine/stages";
import { CHARGE, STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import type { RoomPhase } from "../protocol";
import { Announcer } from "./announcer";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";
import { battleTune, LOBBY_TUNE } from "./tunes";

/** The mix in the lobby, and in a fight where the hits come first. */
const LOBBY_LEVELS = { music: 0.55, crowd: 0.5, sfx: 0.9 };
const FIGHT_LEVELS = { music: 0.4, crowd: 0.7, sfx: 1 };

/** A launch this fast (metres a second) gets the crowd going "ooh". */
const OOH_SPEED = 17;

/**
 * Decides what the stage sounds like: the lobby tune, the battle theme
 * in the stage's own voice, a sound for every event, the crowd rising
 * with the damage on screen and the announcer's calls. Everything goes
 * through the room's buses; the music steps aside for KOs and the voice.
 */
export class SoundDirector {
  readonly announcer: Announcer;
  private readonly sfx: Sfx;
  private readonly crowd: Crowd;
  private readonly music: Music;
  private phase: RoomPhase | null = null;
  private oohAt = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    this.announcer = new Announcer((priority) => this.underVoice(priority));
    engine.setLevels(LOBBY_LEVELS);
  }

  setPhase(phase: RoomPhase, stage: StageId | null): void {
    if (phase === this.phase) return;
    this.phase = phase;
    if (phase === "lobby") {
      this.engine.setLevels(LOBBY_LEVELS);
      this.music.play(LOBBY_TUNE);
      this.crowd.start();
      this.crowd.setLevel(0.1);
    } else if (phase === "countdown" && stage) {
      this.engine.setLevels(FIGHT_LEVELS);
      this.music.play(battleTune(stage));
      this.crowd.start();
      this.crowd.setLevel(0.5);
      this.crowd.claps(24, 2);
    } else if (phase === "results") {
      this.later(2600, () => {
        if (this.phase !== "results") return;
        this.engine.setLevels(LOBBY_LEVELS);
        this.music.play(LOBBY_TUNE);
      });
    }
  }

  /** The crowd follows the fight: louder as damage piles up and when it comes down to the last lives. */
  frame(m: MatchState): void {
    if (m.phase !== "fight") return;
    const alive = m.fighters.filter((f) => f.stocks > 0);
    const heat = Math.min(1, Math.max(0, ...alive.map((f) => f.percent)) / 150);
    const lastLives = alive.length <= 2 && alive.every((f) => f.stocks === 1) ? 0.2 : 0;
    this.crowd.setLevel(0.25 + heat * 0.4 + lastLives);
  }

  event(e: MatchEvent, m: MatchState): void {
    switch (e.type) {
      case "countdown":
        this.sfx.countdown(e.call);
        if (e.call === "fight") this.crowd.cheer(0.6);
        return;
      case "jump":
        return this.sfx.jump(e.double);
      case "land":
        return this.sfx.land();
      case "swing": {
        const f = m.fighters[e.id];
        if (f && e.move !== "ult") this.sfx.swing(f.character, isHeavyKey(e.move));
        return;
      }
      case "charge":
        return this.sfx.charge(CHARGE.full * STEP);
      case "hit":
        this.sfx.hit(e.sound, 0.3 + Math.min(1, e.speed / 22) * 0.7 + (e.heavy ? 0.1 : 0));
        if (e.speed > OOH_SPEED && performance.now() - this.oohAt > 1500) {
          this.oohAt = performance.now();
          this.crowd.ooh();
        }
        return;
      case "block":
        return this.sfx.block();
      case "shieldBreak":
        this.sfx.shieldBreak();
        this.crowd.ooh();
        return;
      case "projectile":
        return this.sfx.bolt();
      case "ultReady":
        return this.sfx.ultReady();
      case "ult":
        this.sfx.ult();
        this.engine.duck("music", 0.4, 1.4);
        this.crowd.cheer(0.5);
        return;
      case "ko":
        this.sfx.ko();
        this.engine.duck("music", 0.35, 1.6);
        this.crowd.cheer(e.stocksLeft === 0 ? 1 : 0.75);
        return;
      case "respawn":
        return this.sfx.respawn();
      case "game":
        this.sfx.gong();
        this.music.fanfare();
        this.crowd.cheer(1);
        this.later(2200, () => this.crowd.stompClap());
        return;
      default:
        return;
    }
  }

  /** Dips the music and the crowd while the announcer talks, more for a big call. */
  private underVoice(priority: number): void {
    const hold = priority >= 2 ? 1.4 : 1;
    this.engine.duck("music", 0.5, hold);
    this.engine.duck("crowd", 0.7, hold);
  }

  private later(ms: number, run: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, ms);
    this.timers.add(timer);
  }

  stop(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.phase = null;
    this.music.stop();
    this.crowd.stop();
    this.announcer.stop();
    this.sfx.dispose();
  }
}
