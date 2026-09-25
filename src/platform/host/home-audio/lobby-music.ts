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
  /** The filter and echo loop behind the gain, unhooked on stop so none of it lingers. */
  private chain: AudioNode[] = [];
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
    // Rolls off the saw edges so the pads read as a soft wash.
    warmth.type = "lowpass";
    warmth.frequency.value = 1600;
    warmth.Q.value = 0.4;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.gain.setTargetAtTime(0.4, this.engine.now, 1.2);
    this.gain.connect(warmth).connect(this.engine.bus("music"));
    // A soft echo fills the gaps between notes, which is most of what makes it flow.
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.44;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const send = ctx.createGain();
    send.gain.value = 0.35;
    this.gain.connect(send).connect(echo).connect(feedback).connect(echo);
    echo.connect(warmth);
    this.chain = [warmth, echo, feedback, send];
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
    const chain = this.chain;
    this.chain = [];
    // Waits for the echo tail to die away before unhooking it.
    setTimeout(() => {
      gain.disconnect();
      for (const node of chain) node.disconnect();
    }, fadeS * 1000 + 4000);
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
