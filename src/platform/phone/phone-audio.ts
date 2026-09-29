import { AudioEngine } from "@/platform/audio/audio-engine";
import { startAudioSoon } from "@/platform/audio/autoplay";

/**
 * The phone's sound. Inside the Join tap it starts at once. A reload, or a
 * phone moved to a new room, had no tap, so sound waits for the next touch.
 */
export class PhoneAudio {
  private engine: AudioEngine | null = null;
  private stopWaiting: (() => void) | null = null;

  wake(): void {
    const audio = (this.engine ??= new AudioEngine());
    this.stopWaiting?.();
    this.stopWaiting = startAudioSoon(audio.ctx, window, { resume: () => audio.unlock() });
  }

  get(): AudioEngine {
    return (this.engine ??= new AudioEngine());
  }

  close(): void {
    this.stopWaiting?.();
    this.stopWaiting = null;
    this.engine?.close();
    this.engine = null;
  }
}
