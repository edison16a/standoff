import type { AudioEngine } from "@/platform/audio/audio-engine";
import { tone } from "@/platform/audio/voices";
import type { MatchEvent } from "../engine/events";
import { CrowdSound } from "./crowd";
import { PunchSounds } from "./punch-sounds";
import { RingSounds } from "./ring-sounds";

/**
 * Every sound in Boxing, driven by the same match events as the picture.
 * `players` says which boxers are people, so the counter ping only plays
 * for someone who can use it.
 */
export class BoxingAudio {
  readonly punches: PunchSounds;
  readonly ring: RingSounds;
  readonly crowd: CrowdSound;
  private excite = 0.3;
  private players: readonly boolean[] = [true, true];

  constructor(private readonly engine: AudioEngine) {
    this.punches = new PunchSounds(engine);
    this.ring = new RingSounds(engine);
    this.crowd = new CrowdSound(engine);
    this.crowd.setExcitement(0.2);
    this.crowd.start();
  }

  setPlayers(players: readonly boolean[]): void {
    this.players = players;
  }

  event(event: MatchEvent): void {
    switch (event.type) {
      case "intro":
        this.crowd.cheer(0.8);
        this.bump(0.4);
        break;
      case "bell":
        this.ring.bell(event.kind);
        if (event.kind !== "start") this.crowd.cheer(event.kind === "final" ? 1 : 0.6);
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
        this.bump(1);
        break;
      case "count":
        if (event.count < 10) this.ring.count(event.count);
        else this.ring.out();
        break;
      case "rise":
        this.crowd.cheer(0.9);
        break;
      case "stoppage":
        this.crowd.roar(1.3);
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
  }

  /** The slow motion replay: the crowd hushes under it, and the knockout blow lands with a deep boom. */
  replay(on: boolean): void {
    if (on) this.engine.holdDuck("crowd", 0.35);
    else this.engine.duck("crowd", 1, 0);
  }

  replayImpact(): void {
    const out = this.engine.bus("sfx");
    const at = this.engine.now + 0.005;
    tone(this.engine, out, at, { type: "sine", frequency: 90, glideTo: 28, attack: 0.004, decay: 1.4, peak: 0.9 });
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
    this.engine.duck("crowd", 1, 0);
  }

  private bump(amount: number): void {
    this.excite = Math.min(1, this.excite + amount);
    this.crowd.setExcitement(this.excite);
  }
}
