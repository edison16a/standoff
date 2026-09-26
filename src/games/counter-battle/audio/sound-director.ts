import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import type { RoomPhase } from "../protocol";
import { Announcer } from "./announcer";
import { Crowd } from "./crowd";
import { GunSounds } from "./guns";
import { place, type Ear } from "./mix";
import { Music } from "./music";
import { Sfx } from "./sfx";
import { Footsteps } from "./steps";
import { FINAL_TUNE, LOBBY_TUNE, MATCH_TUNE } from "./tunes";

/** The mix in the lobby, and in a match where the gunfire comes first. */
const LOBBY_LEVELS = { music: 0.55, crowd: 0.45, sfx: 0.9 };
const MATCH_LEVELS = { music: 0.3, crowd: 0.6, sfx: 1 };
/** Reloads and dry clicks further than this from every player are not worth hearing. */
const NEAR = 18;

/**
 * Decides what the field sounds like: the lobby tune, the match theme
 * (lifted for a match point), every gun, bullet and footstep placed for
 * the players on the couch, the hit ticks each player earns, the crowd
 * rising with the fighting, and the announcer. Everything goes through
 * the room's buses; the music steps aside for kills and the voice.
 */
export class SoundDirector {
  readonly announcer: Announcer;
  private readonly guns: GunSounds;
  private readonly sfx: Sfx;
  private readonly crowd: Crowd;
  private readonly music: Music;
  private readonly steps: Footsteps;
  private phase: RoomPhase | null = null;
  private heat = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly engine: AudioEngine) {
    this.guns = new GunSounds(engine);
    this.sfx = new Sfx(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    this.steps = new Footsteps(this.sfx);
    this.announcer = new Announcer((priority) => this.underVoice(priority));
    engine.setLevels(LOBBY_LEVELS);
  }

  setPhase(phase: RoomPhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.crowd.start();
    if (phase === "lobby") {
      this.engine.setLevels(LOBBY_LEVELS);
      this.music.play(LOBBY_TUNE);
      this.crowd.setLevel(0.1);
    } else if (phase === "match") {
      this.engine.setLevels(MATCH_LEVELS);
      this.music.play(MATCH_TUNE);
      this.crowd.setLevel(0.35);
      this.crowd.claps(24, 2);
    } else {
      // The fanfare has played by now; the lobby tune comes back under the results.
      this.later(1500, () => {
        if (this.phase !== "results") return;
        this.engine.setLevels(LOBBY_LEVELS);
        this.music.play(LOBBY_TUNE);
      });
    }
  }

  /** Every event of the frame, placed for the players listening. */
  hear(events: readonly BattleEvent[], b: Battle, ears: readonly Ear[]): void {
    for (const e of events) this.event(e, b, ears);
  }

  /** Footsteps, and the crowd following the fighting. */
  frame(b: Battle, ears: readonly Ear[], dt: number): void {
    this.steps.update(b, ears, dt);
    this.heat = Math.max(0, this.heat - dt * 0.12);
    if (b.match.phase === "fight") this.crowd.setLevel(0.3 + this.heat * 0.6);
  }

  private event(e: BattleEvent, b: Battle, ears: readonly Ear[]): void {
    const at = (id: number) => b.fighters[id]!.pos;
    const ear = (id: number) => ears.find((x) => x.id === id);
    switch (e.type) {
      case "shot": {
        this.guns.shot(e.gun, place(e.from, ears, b.fighters, e.shooter));
        this.heat = Math.min(1, this.heat + 0.015);
        // One or two strikes per shot is plenty, even for nine pellets.
        for (const t of e.traces.slice(0, 2)) {
          if (t.hit.type === "cover") this.sfx.impact(b.pieces[t.hit.piece]!.kind, place(t.to, ears, b.fighters));
          else if (t.hit.type === "floor") this.sfx.turf(place(t.to, ears, b.fighters));
        }
        return;
      }
      case "dry":
      case "reload-start":
      case "shell": {
        const id = e.type === "dry" ? e.shooter : e.fighter;
        const p = place(at(id), ears, b.fighters, id);
        if (!p.own && p.distance > NEAR) return;
        if (e.type === "dry") this.guns.dry(p);
        else if (e.type === "shell") this.guns.shell(p);
        else this.guns.reload(e.gun, e.seconds, p);
        return;
      }
      case "hit": {
        const shooter = ear(e.shooter);
        if (shooter && e.health > 0) this.sfx.marker(e.head ? "head" : "hit", shooter.pan);
        const target = ear(e.target);
        if (target) this.sfx.hurt(target.pan, e.damage >= 40);
        if (target && e.health > 0 && e.health < 25) this.crowd.ooh();
        this.heat = Math.min(1, this.heat + 0.05);
        return;
      }
      case "kill": {
        const killer = ear(e.killer);
        if (killer) this.sfx.marker("kill", killer.pan);
        this.sfx.down(place(at(e.victim), ears, b.fighters));
        this.crowd.cheer(e.head ? 0.7 : 0.5);
        this.engine.duck("music", 0.5, 1.2);
        this.heat = Math.min(1, this.heat + 0.3);
        return;
      }
      case "countdown": {
        this.sfx.beep(false);
        const m = b.match;
        const point = m.score[0] === m.roundsToWin - 1 || m.score[1] === m.roundsToWin - 1;
        this.music.play(point ? FINAL_TUNE : MATCH_TUNE);
        return;
      }
      case "fight":
        this.sfx.beep(true);
        this.sfx.horn();
        this.crowd.cheer(0.35);
        return;
      case "round-end":
        if (e.winner !== null && e.score[e.winner] < b.match.roundsToWin) this.music.roundSting(e.winner === 1);
        this.crowd.cheer(0.9);
        this.heat = 0.2;
        return;
      case "match-end":
        this.music.fanfare();
        this.crowd.cheer(1);
        this.later(2000, () => this.crowd.claps(40, 3));
        return;
      default:
        return;
    }
  }

  /** Dips the music and the crowd while the announcer talks, more for a big call. */
  private underVoice(priority: number): void {
    const hold = priority >= 2 ? 1.5 : 0.9;
    this.engine.duck("music", 0.45, hold);
    this.engine.duck("crowd", 0.65, hold);
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
  }
}
