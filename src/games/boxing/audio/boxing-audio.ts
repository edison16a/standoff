import type { AudioEngine } from "@/platform/audio/audio-engine";
import { tone } from "@/platform/audio/voices";
import type { MatchEvent } from "../engine/events";
import { Chant } from "./chant";
import { Commentator } from "./commentator";
import { CrowdSound } from "./crowd";
import { Music, type MusicMood } from "./music";
import { PunchSounds } from "./punch-sounds";
import { RingSounds } from "./ring-sounds";

/** The arena starts a chant by itself once it is this worked up, at most this often. */
const CHANT_EXCITE = 0.5;
const CHANT_GAP_S = 18;

/**
 * Every sound in Boxing, driven by the same match events as the picture.
 * `players` says which boxers are people, so the counter ping only plays
 * for someone who can use it. The gym tune plays throughout, full in the
 * menus and low under the crowd in a fight.
 */
export class BoxingAudio {
  readonly punches: PunchSounds;
  readonly ring: RingSounds;
  readonly crowd: CrowdSound;
  private readonly chant: Chant;
  private readonly music: Music;
  private readonly commentator = new Commentator();
  private excite = 0.3;
  private players: readonly boolean[] = [true, true];
  private sinceChant = 0;

  constructor(private readonly engine: AudioEngine) {
    this.punches = new PunchSounds(engine);
    this.ring = new RingSounds(engine);
    this.crowd = new CrowdSound(engine);
    this.chant = new Chant(engine, this.crowd);
    this.music = new Music(engine);
    this.crowd.setExcitement(0.2);
    this.crowd.start();
    this.music.play("menu");
  }

  setPlayers(players: readonly boolean[]): void {
    this.players = players;
  }

  /** The boxers' full names, red corner first, for the commentator. */
  setNames(names: [string, string]): void {
    this.commentator.setNames(names);
  }

  /** Which part of the game is on screen. The results get the fanfare and a cheer. */
  screen(mood: MusicMood): void {
    this.music.play(mood);
    if (mood !== "results") return;
    this.music.fanfare();
    this.crowd.cheer(1);
  }

  event(event: MatchEvent): void {
    this.commentator.event(event);
    switch (event.type) {
      case "intro":
        this.crowd.cheer(0.8);
        this.chant.claps(0.8);
        this.bump(0.4);
        break;
      case "bell":
        this.ring.bell(event.kind);
        if (event.kind !== "start") this.crowd.cheer(event.kind === "final" ? 1 : 0.6);
        if (event.kind === "end") this.chant.name(0.8);
        break;
      case "warning":
        this.ring.clapper();
        break;
      case "throw":
        this.punches.swing(event.style, event.windupMs > 0 ? 0.7 : 1);
        break;
      case "hit": {
        const weight = event.damage / 6 + (event.counter ? 0.5 : 0);
        this.punches.hit(event.style, weight);
        if (event.heavy || event.counter) this.crowd.ooh(Math.min(1.2, 0.5 + weight * 0.4));
        this.bump(0.08 + weight * 0.1);
        break;
      }
      case "block":
        this.punches.block(event.style);
        break;
      case "miss":
        this.punches.miss(event.style);
        if (event.dodge) this.bump(0.05);
        break;
      case "counter":
        if (this.players[event.fighter]) this.punches.counterReady();
        break;
      case "knockdown":
        this.punches.fall();
        this.crowd.roar(1);
        this.engine.duck("music", 0.3, 3);
        this.bump(1);
        break;
      case "count":
        if (event.count < 10) this.ring.count(event.count);
        else this.ring.out();
        break;
      case "rise":
        this.crowd.cheer(0.9);
        this.chant.name(1);
        break;
      case "stoppage":
        this.crowd.roar(1.3);
        this.engine.duck("music", 0.2, 4);
        this.bump(1);
        break;
      case "over":
        if (event.result.method === "Decision" || event.result.method === "Draw") this.crowd.cheer(1.1);
        break;
      case "round":
      case "resume":
      case "interrupted":
        break;
    }
  }

  /** Called every frame: the crowd settles back after each big moment. */
  frame(dt: number): void {
    this.excite += (0.25 - this.excite) * Math.min(1, dt * 0.35);
    this.crowd.setExcitement(this.excite);
    this.sinceChant += dt;
    if (this.excite > CHANT_EXCITE && this.sinceChant > CHANT_GAP_S && !this.chant.busy) {
      this.sinceChant = 0;
      if (Math.random() < 0.5) this.chant.name(this.excite);
      else this.chant.claps(this.excite);
    }
  }

  /** The slow motion replay: the crowd hushes under it, and the knockout blow lands with a deep boom. */
  replay(on: boolean): void {
    if (on) {
      this.engine.holdDuck("crowd", 0.35);
      this.engine.holdDuck("music", 0.4);
    } else {
      this.engine.duck("crowd", 1, 0);
      this.engine.duck("music", 1, 0);
    }
  }

  replayImpact(): void {
    const out = this.engine.bus("sfx");
    const at = this.engine.now + 0.005;
    tone(this.engine, out, at, { type: "sine", frequency: 90, glideTo: 28, attack: 0.004, decay: 1.4, peak: 0.5 });
    this.punches.hit("hook", 1.6);
  }

  /** Interface sounds for the menus: moving between choices and locking one in. */
  tick(): void {
    tone(this.engine, this.engine.bus("ui"), this.engine.now + 0.003, { type: "triangle", frequency: 880, decay: 0.06, peak: 0.25 });
  }

  confirm(): void {
    const at = this.engine.now + 0.003;
    tone(this.engine, this.engine.bus("ui"), at, { type: "triangle", frequency: 660, decay: 0.12, peak: 0.3 });
    tone(this.engine, this.engine.bus("ui"), at + 0.08, { type: "triangle", frequency: 990, decay: 0.22, peak: 0.3 });
  }

  stop(): void {
    this.crowd.stop();
    this.music.stop();
    this.commentator.stop();
    this.engine.duck("crowd", 1, 0);
    this.engine.duck("music", 1, 0);
  }

  private bump(amount: number): void {
    this.excite = Math.min(1, this.excite + amount);
    this.crowd.setExcitement(this.excite);
  }
}
