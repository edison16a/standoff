import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { RaceEvent } from "../engine/events";
import { speedOf } from "../engine/kart";
import { DRIVE } from "../engine/tuning";
import type { RaceWorld } from "../engine/world";
import type { Phase } from "../protocol";
import type { TrackId } from "../tracks";
import { EngineHum } from "./engine-hum";
import { GlideSfx } from "./glide-sfx";
import { GlideWind } from "./glide-wind";
import { Music } from "./music";
import { RaceCaller } from "./race-caller";
import { Sfx } from "./sfx";

/**
 * Decides what the race sounds like: the tune for the map, an engine per
 * kart pitched by its speed, a sound for every race event, and the
 * crowd and the race caller on top. Players' karts are louder than
 * computer ones, so on a shared screen everyone hears their own moments
 * over the pack.
 */
export class SoundDirector {
  private readonly sfx: Sfx;
  private readonly glideSfx: GlideSfx;
  private readonly music: Music;
  private readonly caller: RaceCaller;
  private hums: EngineHum[] = [];
  private winds: GlideWind[] = [];
  private humsFor: RaceWorld | null = null;
  private finalLapPlayed = false;
  private phase: Phase = "lobby";
  private lobbyTune: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.glideSfx = new GlideSfx(engine);
    this.music = new Music(engine);
    this.caller = new RaceCaller(engine);
    engine.setLevels({ music: 0.5, crowd: 0.7, sfx: 0.85 });
  }

  setPhase(phase: Phase, map: TrackId): void {
    this.phase = phase;
    this.clearLobbyTune();
    switch (phase) {
      case "lobby":
        this.stopHums();
        // A race left early must not leave the caller talking over the lobby.
        this.caller.stop();
        this.music.play("lobby");
        this.engine.holdDuck("music", 1);
        return;
      case "countdown":
        this.finalLapPlayed = false;
        this.music.play(null);
        this.caller.countdown();
        return;
      case "racing":
        this.music.play(map);
        return;
      case "results":
        this.music.play(null);
        this.music.fanfare();
        this.caller.results();
        this.engine.holdDuck("sfx", 0.35);
        this.lobbyTune = setTimeout(() => {
          this.lobbyTune = null;
          this.music.play("lobby");
        }, 3500);
        return;
    }
  }

  /** Engines follow every kart's speed, every frame. */
  frame(world: RaceWorld): void {
    if (this.humsFor !== world) {
      this.stopHums();
      this.engine.holdDuck("sfx", 1);
      this.hums = world.karts.map((kart, i) => new EngineHum(this.engine, kart.seat !== null ? 0.05 : 0.018, (i - 1.5) * 9));
      this.winds = world.karts.map((kart) => new GlideWind(this.engine, kart.seat !== null ? 0.09 : 0.03));
      this.humsFor = world;
    }
    world.karts.forEach((kart, i) => {
      const speed = speedOf(kart) / DRIVE.topSpeed;
      const skid = kart.brakeHeld > 0.15 && speed > 0.35 && !kart.airborne;
      const slide = kart.drift !== 0 ? 0.8 : skid ? 0.55 : kart.surface === "offroad" && speed > 0.2 ? 0.35 : kart.timers.ice > 0 && speed > 0.3 ? 0.4 : 0;
      this.hums[i]?.set(Math.min(1.5, speed), kart.throttle, slide, kart.timers.boost > 0, false);
      this.winds[i]?.set(kart.glide, speed);
    });
  }

  event(event: RaceEvent, world: RaceWorld): void {
    const kart = "kart" in event ? world.karts[event.kart] : undefined;
    const level = kart && kart.seat === null ? 0.35 : 1;
    this.caller.event(event, world);
    switch (event.type) {
      case "countdown":
        return this.sfx.countdown(event.count);
      case "go":
        return this.sfx.go();
      case "pickup":
        return this.sfx.pickup(level);
      case "use":
        if (event.item === "orb") this.sfx.throwOrb(level);
        else if (event.item === "ice") this.sfx.throwIce(level);
        else if (event.item === "ghost") this.sfx.vanish(level);
        else if (event.item === "shield") this.sfx.shield(level);
        return;
      case "boost":
        return this.sfx.boost(level, event.source === "nitro" || event.source === "start");
      case "hit":
        return event.by === "ice" ? this.sfx.freeze(level) : this.sfx.spinOut(level);
      case "blocked":
        return this.sfx.blocked(level);
      case "bump":
        return this.sfx.bump(event.strength, level);
      case "jump":
        return this.sfx.jump(level);
      case "land":
        return this.sfx.land(level);
      case "glide":
        return event.open ? this.glideSfx.deploy(level) : this.glideSfx.fold(level);
      case "fell":
        return this.sfx.fall(level);
      case "respawn":
        return this.sfx.respawn(level);
      case "lap":
        if (kart?.seat !== null) this.sfx.lap();
        return;
      case "finalLap":
        // The jingle and the faster tune come once, for the first player to reach the last lap.
        if (kart?.seat === null || this.finalLapPlayed) return;
        this.finalLapPlayed = true;
        this.sfx.finalLap();
        this.engine.duck("music", 0.3, 1.2);
        this.music.setTempo(1.08);
        return;
      case "finish":
        if (kart?.seat !== null) this.sfx.finish();
        return;
      default:
        return;
    }
  }

  /** Leaving the game: silence everything, and the tune queued for after the fanfare never starts. */
  stop(): void {
    this.clearLobbyTune();
    this.stopHums();
    this.music.stop();
    this.caller.stop();
  }

  private clearLobbyTune(): void {
    if (this.lobbyTune) clearTimeout(this.lobbyTune);
    this.lobbyTune = null;
  }

  private stopHums(): void {
    for (const sound of [...this.hums, ...this.winds]) sound.stop();
    this.hums = [];
    this.winds = [];
    this.humsFor = null;
  }
}
