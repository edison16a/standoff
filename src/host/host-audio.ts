import { AudioEngine } from "@/audio/audio-engine";
import { SoundDirector } from "@/audio/sound-director";
import type { Tuning } from "@/shared/tuning";

/**
 * The host's sound, created on first use. Browsers only start audio from a
 * user gesture, so the engine is unlocked inside the "Create game" click,
 * or on the first tap anywhere when the page was reloaded into a game.
 */
export class HostAudio {
  private engine: AudioEngine | null = null;
  director: SoundDirector | null = null;

  constructor(private readonly tuning: () => Tuning) {}

  /** Call from inside a click or tap. */
  async unlock(): Promise<void> {
    await this.ensure().unlock();
  }

  ensure(): AudioEngine {
    if (this.engine) return this.engine;
    const engine = new AudioEngine();
    this.engine = engine;
    this.director = new SoundDirector(engine, this.tuning);
    if (!engine.unlocked) window.addEventListener("pointerdown", () => void engine.unlock(), { once: true });
    return engine;
  }

  dispose(): void {
    this.director?.stop();
    this.engine?.close();
    this.director = null;
    this.engine = null;
  }
}
