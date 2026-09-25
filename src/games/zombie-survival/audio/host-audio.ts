import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Seat } from "@/platform/protocol";
import { chopperPose, CRASH_AT } from "../engine/chopper";
import type { GameEvent } from "../engine/events";
import type { SurvivalGame } from "../engine/game";
import { alive, type Zombie } from "../engine/zombie";
import { isBoss, KINDS } from "../engine/zombie-kinds";
import { gunSlotX } from "../render/gun-layout";
import { Ambience } from "./ambience";
import { cheer } from "./crowd";
import { GunSounds } from "./gun-sounds";
import { ScoreDirector } from "./score-director";
import { Stingers } from "./stingers";
import { ZombieSounds, type Spot } from "./zombie-sounds";

/** At most this many zombie voices at once, so a fight never turns to mush. */
const MAX_VOICES = 3;

/**
 * Zombie Survival's sound on the computer. The platform owns the audio
 * engine and unlocked it in the click that opened the room. This plays
 * the guns, the zombies, the beds under them, the score and the story
 * beats, from the same events that drive the picture.
 */
export class HostAudio {
  private readonly guns: GunSounds;
  private readonly zombies: ZombieSounds;
  private readonly stingers: Stingers;
  private readonly ambience: Ambience;
  private readonly score: ScoreDirector;
  private readonly growlAt = new Map<number, number>();
  /** When each walking boss next puts a foot down. */
  private readonly stompAt = new Map<number, number>();
  private voices: number[] = [];
  private crashed = false;

  constructor(private readonly engine: AudioEngine) {
    this.guns = new GunSounds(engine);
    this.zombies = new ZombieSounds(engine);
    this.stingers = new Stingers(engine);
    this.ambience = new Ambience(engine);
    this.ambience.start();
    this.score = new ScoreDirector(engine);
  }

  onStart(): void {
    this.growlAt.clear();
    this.stompAt.clear();
    this.crashed = false;
  }

  onLobby(): void {
    this.ambience.rotorLevel(0, 0);
    this.score.lobby();
  }

  react(event: GameEvent, game: SurvivalGame): void {
    const pan = (seat: Seat) => this.panFor(seat, game);
    const spot = (id: number) => this.spotOf(game, id);
    switch (event.type) {
      case "shot":
        return this.guns.shot(event.weapon, pan(event.seat));
      case "dry":
        return this.guns.dry(pan(event.seat));
      case "reload-start":
        return this.guns.reload(event.weapon, pan(event.seat), event.seconds);
      case "shell":
        return this.guns.shell(pan(event.seat));
      case "reloaded":
        if (game.squad.get(event.seat)?.gun.weapon === "shotgun") this.guns.pump(pan(event.seat));
        return;
      case "hit": {
        const at = spot(event.zombie);
        if (event.part === "weak") return this.zombies.weak(at, false);
        if (event.blocked && event.damage === 0) return this.zombies.ping(at);
        if (event.blocked) this.zombies.ping(at);
        return this.zombies.flesh(at, event.part === "head");
      }
      case "weak-broken":
        return this.zombies.weak(spot(event.zombie), true);
      case "kill":
        return this.zombies.fall(spot(event.zombie), isBoss(event.kind));
      case "spawn":
        if (isBoss(event.kind)) {
          this.stingers.bossArrives();
          this.score.dip(0.3, 4);
          this.zombies.growl(spot(event.zombie), 0.4, 2.5, 2);
        }
        return;
      case "swing":
        return this.zombies.swipe(spot(event.zombie), isBoss(event.kind));
      case "radio":
        this.score.dip(0.6, Math.min(4.5, 0.8 + event.line.text.length * 0.045));
        return this.stingers.radio(event.line.text.length);
      case "achievement":
        return this.stingers.achievement();
      case "stage-clear":
        this.score.dip(0.4, 2.5);
        return this.stingers.checkpoint();
      case "phase":
        this.score.phase(event.phase);
        if (event.phase === "down") this.stingers.gameOver();
        if (event.phase === "escaped") this.celebrate(game.squad.present().length);
        if (event.phase === "cutscene" && game.cutscene === "escape") this.stingers.horn(1.5);
        return;
    }
  }

  /** Each frame: zombie voices, the beds, and the chopper. */
  frame(game: SurvivalGame, dt: number): void {
    const standing = game.encounter?.zombies.filter(alive) ?? [];
    this.ambience.frame(dt, {
      fighting: game.phase === "fight",
      walking: game.phase === "travel" || (game.phase === "cutscene" && game.cutscene === "escape" && game.phaseTime < 10.5),
      health: game.running ? game.health : 100,
      walkers: game.squad.present().length,
    });
    this.voiceZombies(standing, game.time);
    const pose = chopperPose(game.phase, game.stage, game.cutscene, game.phaseTime);
    this.ambience.rotorLevel(pose?.loudness ?? 0, pose?.failing ?? 0);
    const crashNow = game.cutscene === "chopper" && game.phaseTime >= CRASH_AT;
    if (crashNow && !this.crashed) this.stingers.explosion();
    this.crashed = crashNow;
  }

  dispose(): void {
    this.ambience.stop();
    this.score.stop();
  }

  /** Out alive: the fanfare, and the survivors whooping as the boat pulls away. */
  private celebrate(survivors: number): void {
    this.stingers.victory();
    cheer(this.engine, this.engine.bus("crowd"), this.engine.now + 0.8, { size: Math.min(0.5, 0.2 + survivors * 0.08), length: 2.6 });
  }

  /** Growls come more often from zombies that are close. */
  private voiceZombies(standing: Zombie[], now: number): void {
    const t = this.engine.now;
    this.voices = this.voices.filter((end) => end > t);
    for (const z of standing) {
      const due = this.growlAt.get(z.id);
      const gap = 1.5 + Math.min(z.ahead, 30) / 5 + z.seed * 2;
      if (due === undefined) {
        this.growlAt.set(z.id, now + z.seed * 3);
        continue;
      }
      if (now < due || this.voices.length >= MAX_VOICES) continue;
      this.growlAt.set(z.id, now + gap);
      const spot = { side: z.side, ahead: z.ahead };
      const boss = isBoss(z.kind);
      this.zombies.growl(spot, boss ? 0.45 : 1.8 / KINDS[z.kind].height, boss ? 2 : 1, boss ? 1.6 : 1);
      if (z.ahead < 14 && !boss) this.zombies.shuffle(spot);
      this.voices.push(t + 1.4);
    }
    if (this.growlAt.size > 200) this.growlAt.clear();
    this.stomp(standing, now);
  }

  /** A walking boss shakes the ground with every step, louder as it closes in. */
  private stomp(standing: Zombie[], now: number): void {
    for (const z of standing) {
      if (!isBoss(z.kind) || z.state !== "walk") continue;
      const due = this.stompAt.get(z.id) ?? now;
      if (now < due) continue;
      this.stompAt.set(z.id, now + 1 / Math.max(0.5, z.speed * 2.6));
      this.zombies.stomp({ side: z.side, ahead: z.ahead });
    }
    if (this.stompAt.size > 20) this.stompAt.clear();
  }

  private spotOf(game: SurvivalGame, id: number): Spot {
    const z = game.encounter?.find(id);
    return z ? { side: z.side, ahead: z.ahead } : { side: 0, ahead: 10 };
  }

  private panFor(seat: Seat, game: SurvivalGame): number {
    const playing = game.squad.all();
    const index = playing.findIndex((m) => m.seat === seat);
    return index < 0 ? 0 : gunSlotX(index, playing.length) * 0.6;
  }
}
