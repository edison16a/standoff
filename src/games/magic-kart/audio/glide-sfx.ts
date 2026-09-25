import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";

const vary = (spread = 0.05) => 1 - spread + Math.random() * spread * 2;

/**
 * The glider's one shot sounds, on the engine's effects bus. Opening is
 * a rising whoosh as the mast shoots up, then the crack of cloth pulling
 * tight a beat later, when the wing snaps out. Folding is a softer
 * falling rustle with a click as the frame locks down.
 */
export class GlideSfx {
  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  deploy(level: number): void {
    const at = this.engine.now + 0.005;
    const v = vary();
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 350 * v, sweepTo: 2600, q: 0.9, attack: 0.06, decay: 0.32, peak: 0.3 * level });
    tone(this.engine, this.out, at, { type: "triangle", frequency: 220 * v, glideTo: 520, attack: 0.03, decay: 0.25, peak: 0.05 * level });
    // The snap: a sharp broadband crack, a low thump of the cloth filling, and a flap after it.
    const snap = at + 0.2;
    noise(this.engine, this.out, snap, { filter: "highpass", frequency: 1800 * v, decay: 0.04, peak: 0.42 * level });
    noise(this.engine, this.out, snap, { filter: "bandpass", frequency: 900 * v, q: 1.4, decay: 0.09, peak: 0.3 * level });
    tone(this.engine, this.out, snap, { frequency: 110 * v, glideTo: 70, decay: 0.14, peak: 0.26 * level });
    noise(this.engine, this.out, snap + 0.07, { filter: "bandpass", frequency: 1300 * v, q: 2, decay: 0.05, peak: 0.14 * level });
  }

  fold(level: number): void {
    const at = this.engine.now + 0.005;
    const v = vary();
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 2200 * v, sweepTo: 500, q: 1.1, attack: 0.02, decay: 0.26, peak: 0.2 * level });
    noise(this.engine, this.out, at + 0.05, { filter: "bandpass", frequency: 1500 * v, q: 3, decay: 0.04, peak: 0.1 * level });
    // The frame locking down.
    tone(this.engine, this.out, at + 0.2, { type: "square", frequency: 1400 * v, decay: 0.03, peak: 0.035 * level });
    noise(this.engine, this.out, at + 0.2, { filter: "highpass", frequency: 3000, decay: 0.03, peak: 0.12 * level });
  }
}
