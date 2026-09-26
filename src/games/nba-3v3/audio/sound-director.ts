import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { Phase as PlayPhase } from "../engine/types";
import type { Phase } from "../protocol";
import { ArenaSounds, type Stab } from "./arena";
import { ArenaBeat } from "./arena-beat";
import { playCue } from "./cues";
import { Music } from "./music";
import { Sfx } from "./sfx";

/**
 * The mix in the lobby and under a game. The crowd bus stays silent: a
 * synthesised crowd sounded like wind, so the beat, the organ and the
 * horns carry the building now and the music sits a touch higher.
 */
const LOBBY_LEVELS = { music: 0.55, crowd: 0, sfx: 0.9 };
const GAME_LEVELS = { music: 0.34, crowd: 0, sfx: 0.95 };
/** Bars of stomp stomp clap on a dead ball. Play going live cuts it short. */
const BEAT_BARS = 3;
/** The beat waits for the basket's own sounds and any organ stab to ring out. */
const BEAT_DELAY_S = 0.7;
/** Organ stabs this close together would step on each other. */
const STAB_GAP_S = 1.2;

/**
 * Decides what the arena sounds like: a late night soul tune in the lobby and
 * arena hip hop under the game, the stomp stomp clap on every dead ball
 * and before free throws, the shot clock's beeps and buzzer, the game
 * horn, organ stabs on big moments and a sound for every event on the
 * floor. There is no spoken commentary.
 */
export class SoundDirector {
  private readonly sfx: Sfx;
  private readonly arena: ArenaSounds;
  private readonly beat: ArenaBeat;
  private readonly music: Music;
  private phase: Phase | null = null;
  private play: PlayPhase | null = null;
  private beeped = 99;
  private stabAt = -99;
  /** Delayed music cues, cleared on stop so nothing plays after the game has closed. */
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    const out = engine.bus("sfx");
    this.arena = new ArenaSounds(engine, out, this.sfx.wet);
    this.beat = new ArenaBeat(engine, out, this.sfx.wet);
    this.music = new Music(engine);
    engine.setLevels(LOBBY_LEVELS);
  }

  setPhase(phase: Phase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    if (phase === "lobby") {
      this.stopBeat();
      this.play = null;
      this.engine.setLevels(LOBBY_LEVELS);
      this.music.play("lobby");
    } else if (phase === "countdown") {
      // A new game's clock starts from zero again.
      this.stabAt = -99;
      this.engine.setLevels(GAME_LEVELS);
      this.music.play("play");
    } else if (phase === "over") {
      this.stopBeat();
      this.music.fanfare();
      this.later(3500, () => {
        if (this.phase !== "over") return;
        this.engine.setLevels(LOBBY_LEVELS);
        this.music.play("lobby");
      });
    }
  }

  /** Follows the ball's state: the beat on dead balls, the beeps in the last five seconds. */
  frame(m: Match): void {
    if (m.phase !== this.play) {
      this.play = m.phase;
      this.onPlayPhase(m.phase);
    }
    if (m.phase !== "live") return;
    // One beep per second through the last five while the ball is in hand.
    const left = Math.ceil(m.shotClock);
    if (left <= 5 && left > 0 && left < this.beeped && m.ball.mode !== "flight") this.arena.clockBeep(left);
    this.beeped = left;
  }

  event(e: MatchEvent, m: Match): void {
    // The building goes quiet for the shooter at the line.
    if (e.type === "freeThrow") this.stopBeat();
    playCue(e, m, { engine: this.engine, sfx: this.sfx, arena: this.arena, stab: (stab, key) => this.stab(stab, m, key) });
  }

  /** Called after the green of a perfect release, for the host's own chime. */
  green(): void {
    this.sfx.green();
  }

  private onPlayPhase(to: PlayPhase): void {
    // A dead ball after a basket or a turnover, or the whistle for a foul: the building stomps.
    if (to === "dead" || to === "freeThrow") this.startBeat();
    else if (to === "live" || to === "over") this.stopBeat();
  }

  private startBeat(): void {
    if (this.beat.playing) return;
    this.beat.start(BEAT_BARS, BEAT_DELAY_S);
    // The loop steps back so the stomps and claps sit on top of it.
    this.engine.holdDuck("music", 0.5);
  }

  private stopBeat(): void {
    this.beat.stop();
    this.engine.duck("music", 1, 0);
  }

  private stab(stab: Stab, m: Match, key?: number): void {
    if (m.time - this.stabAt < STAB_GAP_S) return;
    this.stabAt = m.time;
    this.arena.organ(stab, key);
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
    this.beat.stop();
    this.music.stop();
    this.arena.dispose();
    this.sfx.dispose();
  }
}
