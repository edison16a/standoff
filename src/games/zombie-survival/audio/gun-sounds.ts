import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { WeaponId } from "../engine/weapons";
import { drive, sendTo } from "./nodes";

/**
 * Every gun sound, synthesised. Each weapon has its own voice: the
 * shotgun a deep boom and a pump, the SMG a quick snap, the rifle a
 * clean crack and the AK a heavier bark. A street echo trails each shot.
 */
export class GunSounds {
  constructor(private readonly engine: AudioEngine) {}

  /** Where one sound goes: through the grit, then panned toward the shooter's gun. */
  private out(pan: number, gain = 1): GainNode {
    const input = sendTo(this.engine, this.engine.bus("sfx"), gain, pan);
    // The grit used to hang off the send with nothing feeding it. Sounds now pass through it.
    const pre = this.engine.ctx.createGain();
    const grit = drive(this.engine, 2.2);
    pre.connect(grit).connect(input);
    setTimeout(() => {
      pre.disconnect();
      grit.disconnect();
    }, 4000);
    return pre;
  }

  shot(weapon: WeaponId, pan: number): void {
    const e = this.engine;
    const at = e.now;
    const out = this.out(pan);
    const vary = 0.94 + Math.random() * 0.12;
    const echo = (delay: number, freq: number, peak: number, decay: number) =>
      noise(e, out, at + delay, { filter: "bandpass", frequency: freq * vary, q: 0.8, decay, peak });
    switch (weapon) {
      case "shotgun":
        noise(e, out, at, { filter: "highpass", frequency: 2400, decay: 0.06, peak: 0.6 });
        noise(e, out, at, { filter: "lowpass", frequency: 1300 * vary, decay: 0.45, peak: 1 });
        tone(e, out, at, { type: "sine", frequency: 78 * vary, glideTo: 32, decay: 0.4, peak: 0.95 });
        echo(0.09, 380, 0.22, 1.1);
        this.pump(pan, at + 0.32);
        return;
      case "smg":
        noise(e, out, at, { filter: "highpass", frequency: 1700 * vary, decay: 0.045, peak: 0.5 });
        noise(e, out, at, { filter: "bandpass", frequency: 950 * vary, q: 1.2, decay: 0.08, peak: 0.35 });
        tone(e, out, at, { type: "square", frequency: 190 * vary, glideTo: 90, decay: 0.045, peak: 0.12 });
        echo(0.06, 600, 0.06, 0.35);
        return;
      case "rifle":
        noise(e, out, at, { filter: "highpass", frequency: 2300 * vary, decay: 0.07, peak: 0.65 });
        noise(e, out, at, { filter: "lowpass", frequency: 1600 * vary, decay: 0.16, peak: 0.55 });
        tone(e, out, at, { type: "sine", frequency: 125 * vary, glideTo: 48, decay: 0.12, peak: 0.45 });
        echo(0.08, 520, 0.1, 0.6);
        return;
      case "ak47":
        noise(e, out, at, { filter: "highpass", frequency: 1800 * vary, decay: 0.08, peak: 0.6 });
        noise(e, out, at, { filter: "lowpass", frequency: 950 * vary, decay: 0.24, peak: 0.85 });
        tone(e, out, at, { type: "sine", frequency: 92 * vary, glideTo: 38, decay: 0.18, peak: 0.7 });
        tone(e, out, at, { type: "sawtooth", frequency: 64 * vary, glideTo: 40, decay: 0.08, peak: 0.12 });
        echo(0.09, 430, 0.14, 0.8);
        return;
    }
  }

  /** The pump racked back and forward. */
  pump(pan: number, at = this.engine.now): void {
    const out = this.out(pan, 0.8);
    noise(this.engine, out, at, { filter: "bandpass", frequency: 1600, q: 2.5, decay: 0.05, peak: 0.35 });
    noise(this.engine, out, at + 0.16, { filter: "bandpass", frequency: 2100, q: 2.5, decay: 0.05, peak: 0.4 });
    tone(this.engine, out, at + 0.16, { type: "triangle", frequency: 900, decay: 0.03, peak: 0.1 });
  }

  /** The hollow click of a trigger on an empty chamber. */
  dry(pan: number): void {
    const out = this.out(pan, 0.9);
    const at = this.engine.now;
    tone(this.engine, out, at, { type: "square", frequency: 2600, decay: 0.012, peak: 0.25 });
    noise(this.engine, out, at, { filter: "bandpass", frequency: 3400, q: 3, decay: 0.03, peak: 0.3 });
  }

  /** Magazine out, a pause, magazine in, then the bolt. Timed to the reload. */
  reload(weapon: WeaponId, pan: number, seconds: number): void {
    const out = this.out(pan, 0.9);
    const e = this.engine;
    const at = e.now;
    if (weapon === "shotgun") {
      noise(e, out, at, { filter: "bandpass", frequency: 1200, q: 2, decay: 0.06, peak: 0.2 });
      return;
    }
    // Out: a slide and a clack.
    noise(e, out, at + 0.12, { filter: "bandpass", frequency: 1400, q: 1.5, sweepTo: 700, decay: 0.12, peak: 0.3 });
    tone(e, out, at + 0.2, { type: "triangle", frequency: 520, decay: 0.05, peak: 0.12 });
    // In: seated with a solid clack.
    const seat = at + seconds * 0.62;
    noise(e, out, seat, { filter: "bandpass", frequency: 1900, q: 2, decay: 0.05, peak: 0.45 });
    tone(e, out, seat, { type: "square", frequency: 330, decay: 0.03, peak: 0.1 });
    // The charging handle, back and home.
    const bolt = at + seconds * 0.86;
    noise(e, out, bolt, { filter: "bandpass", frequency: 2600, q: 3, decay: 0.04, peak: 0.4 });
    noise(e, out, bolt + 0.1, { filter: "bandpass", frequency: 1800, q: 3, decay: 0.05, peak: 0.45 });
  }

  /** One shell pushed into the tube. */
  shell(pan: number): void {
    const out = this.out(pan, 0.8);
    const at = this.engine.now;
    noise(this.engine, out, at, { filter: "bandpass", frequency: 2400, q: 3, decay: 0.035, peak: 0.35 });
    tone(this.engine, out, at + 0.02, { type: "triangle", frequency: 1250, decay: 0.03, peak: 0.08 });
  }
}
