import type { AudioEngine } from "@/platform/audio/audio-engine";
import { LOBBY_BPM, playLobbyStep, STEPS_PER_LOOP } from "./lobby-tune";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.12;

/**
 * Loops the lobby tune with a lookahead scheduler, so the beat stays
 * tight while the home screen is busy playing video. Fades in and out
 * through its own gain so starting a game never cuts a note.
 */
export class LobbyMusic {
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextAt = 0;

  constructor(private readonly engine: AudioEngine) {}

  get playing(): boolean {
    return this.gain !== null;
  }

  start(): void {
    if (this.gain) return;
    const { ctx } = this.engine;
    const warmth = ctx.createBiquadFilter();
    // Rolls off the top so it reads as a record in the next room.
    warmth.type = "lowpass";
    warmth.frequency.value = 2400;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.gain.setTargetAtTime(0.9, this.engine.now, 0.8);
    this.gain.connect(warmth).connect(this.engine.bus("music"));
    this.step = 0;
    this.nextAt = this.engine.now + 0.1;
    this.timer = setInterval(() => this.schedule(), WAKE_MS);
  }

  stop(fadeS = 0.4): void {
    if (!this.gain) return;
    const gain = this.gain;
    gain.gain.cancelScheduledValues(this.engine.now);
    gain.gain.setTargetAtTime(0.0001, this.engine.now, fadeS / 3);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.gain = null;
    setTimeout(() => gain.disconnect(), fadeS * 1000 + 1500);
  }

  private schedule(): void {
    if (!this.gain) return;
    const sixteenth = 60 / LOBBY_BPM / 4;
    // A tab left in the background would otherwise play every missed note at once.
    if (this.nextAt < this.engine.now - 0.5) this.nextAt = this.engine.now + 0.05;
    while (this.nextAt < this.engine.now + LOOKAHEAD_S) {
      playLobbyStep(this.engine, this.gain, this.step, this.nextAt);
      this.step = (this.step + 1) % STEPS_PER_LOOP;
      this.nextAt += sixteenth;
    }
  }
}
