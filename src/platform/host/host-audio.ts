import { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * The big screen's sound. Made on first use and again after `close`,
 * because React mounts the app twice in development and the first unmount
 * closes the context. After a reload there was no click to start the
 * sound, so the first tap anywhere does it.
 */
export class HostAudio {
  private engine: AudioEngine | null = null;

  private readonly unlockOnTap = () => {
    void this.get().unlock().then(() => {
      if (this.get().unlocked) window.removeEventListener("pointerdown", this.unlockOnTap);
    });
  };

  get(): AudioEngine {
    this.engine ??= new AudioEngine();
    return this.engine;
  }

  listen(): void {
    window.addEventListener("pointerdown", this.unlockOnTap);
  }

  close(): void {
    window.removeEventListener("pointerdown", this.unlockOnTap);
    this.engine?.close();
    this.engine = null;
  }
}
