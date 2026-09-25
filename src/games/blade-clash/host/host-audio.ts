import { SoundDirector } from "@/games/blade-clash/audio/sound-director";
import type { Tuning } from "@/games/blade-clash/tuning";
import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * Fencing's sound on the computer. The platform owns the audio engine and
 * unlocked it in the click that opened the room. This directs it: music,
 * crowd and the sound of every clash.
 */
export class HostAudio {
  readonly director: SoundDirector;

  constructor(engine: AudioEngine, tuning: () => Tuning) {
    this.director = new SoundDirector(engine, tuning);
  }

  dispose(): void {
    this.director.stop();
  }
}
