import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Seat } from "@/platform/protocol";
import type { TargetKind } from "../engine/kinds";
import type { GalleryPhase } from "../protocol";
import { Barker } from "./barker";
import { Crowd } from "./crowd";
import { Music } from "./music";
import { Sfx } from "./sfx";
import { TargetSounds } from "./target-sounds";

const MUSIC_LEVEL = 0.5;
const CROWD_LEVEL = 0.8;
const SFX_LEVEL = 0.9;

/**
 * Decides what the gallery sounds like. The session calls it from the
 * same events that drive the picture, so every pop, ding and quack lands
 * on the frame its animation starts. Hits in a row climb in pitch, and
 * the onlookers react to streaks, golden ducks and the winner.
 */
export class GalleryAudio {
  readonly sfx: Sfx;
  private readonly targets: TargetSounds;
  private readonly crowd: Crowd;
  private readonly barker = new Barker();
  private readonly music: Music;
  private readonly streaks = new Map<Seat, number>();
  private musicOn = true;
  private fanfare: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.targets = new TargetSounds(engine);
    this.crowd = new Crowd(engine);
    this.music = new Music(engine);
    this.applyLevels();
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    this.applyLevels();
  }

  phase(phase: GalleryPhase): void {
    this.cancelFanfare();
    switch (phase) {
      case "lobby":
        this.barker.stop();
        this.music.play("lobby");
        break;
      case "countdown":
        // The countdown ticks alone, so the start lands clearly.
        this.streaks.clear();
        this.music.play(null);
        break;
      case "playing":
        this.sfx.go();
        this.barker.start();
        this.music.play("round");
        break;
      case "results":
        this.music.play(null);
        this.sfx.buzzer();
        this.crowd.applause(1, 0.5);
        this.crowd.cheer(1, 0.6);
        this.fanfare = setTimeout(() => {
          this.music.fanfare();
          this.barker.winner();
        }, 900);
        break;
    }
  }

  /** One second of the "3, 2, 1". */
  count(): void {
    this.sfx.tick();
  }

  /** One of the last seconds of the round. The barker calls the first of them. */
  final(n: number): void {
    this.sfx.tick(n <= 3);
    if (n === 5) this.barker.last();
  }

  /** A trigger pull, and the sound of whatever it struck a moment later. */
  shot(seat: Seat, kind: TargetKind | null, bull: boolean): void {
    this.sfx.pop();
    this.sfx.pump();
    if (!kind) {
      this.streaks.set(seat, 0);
      return this.sfx.thud();
    }
    const streak = (this.streaks.get(seat) ?? 0) + 1;
    this.streaks.set(seat, streak);
    if (kind === "golden") {
      this.targets.golden();
      this.crowd.cheer(0.8, 0.2);
      this.crowd.applause(0.5, 0.3);
      this.engine.duck("music", 0.5, 1.2);
    } else if (kind === "duck" || kind === "duckling") {
      this.targets.quack(kind === "duck" ? 1 : 1.35);
    } else {
      this.targets.ding(bull, streak - 1);
    }
    if (bull || streak === 3 || streak === 6) this.crowd.ooh(bull ? 0.6 : 0.5 + streak * 0.05);
  }

  landed(kind: TargetKind): void {
    this.targets.clack(kind === "plate");
  }

  dispose(): void {
    this.cancelFanfare();
    this.barker.stop();
    this.music.stop();
  }

  private cancelFanfare(): void {
    if (this.fanfare) clearTimeout(this.fanfare);
    this.fanfare = null;
  }

  private applyLevels(): void {
    this.engine.setLevels({ music: this.musicOn ? MUSIC_LEVEL : 0, crowd: CROWD_LEVEL, sfx: SFX_LEVEL });
  }
}
