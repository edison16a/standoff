import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { TargetKind } from "../engine/kinds";
import type { GalleryPhase } from "../protocol";
import { Music } from "./music";
import { Sfx } from "./sfx";

const MUSIC_LEVEL = 0.5;
const SFX_LEVEL = 0.9;

/**
 * Decides what the gallery sounds like. The session calls it from the
 * same events that drive the picture, so every pop, ding and quack lands
 * on the frame its animation starts.
 */
export class GalleryAudio {
  readonly sfx: Sfx;
  private readonly music: Music;
  private musicOn = true;
  private fanfare: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
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
        this.music.play("waltz");
        break;
      case "countdown":
        // The countdown ticks alone, so the start lands clearly.
        this.music.play(null);
        break;
      case "playing":
        this.sfx.go();
        this.music.play("polka");
        break;
      case "results":
        this.music.play(null);
        this.sfx.buzzer();
        this.fanfare = setTimeout(() => this.music.fanfare(), 900);
        break;
    }
  }

  /** A trigger pull, and the sound of whatever it struck a moment later. */
  shot(kind: TargetKind | null, bull: boolean): void {
    this.sfx.pop();
    this.sfx.pump();
    if (!kind) return this.sfx.thud();
    if (kind === "golden") return this.sfx.golden();
    if (kind === "duck") return this.sfx.quack(1);
    if (kind === "duckling") return this.sfx.quack(1.35);
    this.sfx.ding(bull);
  }

  landed(kind: TargetKind): void {
    this.sfx.clack(kind === "plate");
  }

  dispose(): void {
    this.cancelFanfare();
    this.music.stop();
  }

  private cancelFanfare(): void {
    if (this.fanfare) clearTimeout(this.fanfare);
    this.fanfare = null;
  }

  private applyLevels(): void {
    this.engine.setLevels({ music: this.musicOn ? MUSIC_LEVEL : 0, crowd: 0, sfx: SFX_LEVEL });
  }
}
