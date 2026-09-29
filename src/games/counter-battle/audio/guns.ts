import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { GunId } from "../engine/guns";
import { sendTo, vary, type Placed } from "./mix";

/**
 * Every paint marker sound, synthesised, each with its own voice: the
 * rifle a clean thwup, the shotgun a big whump and a pump, the SMG a
 * quick light pop and the sniper a sharp crack of air with a long hiss
 * before it is cocked again. Far shots lose their top, so distance is
 * heard as well as seen.
 */
export class GunSounds {
  constructor(private readonly engine: AudioEngine) {}

  /** Where one sound goes: dulled with distance, panned toward the nearest player's view. */
  private out(p: Placed, gain = 1, lifeS = 3): AudioNode {
    const send = sendTo(this.engine, this.engine.bus("sfx"), gain * p.gain, p.pan, lifeS);
    const dull = this.engine.ctx.createBiquadFilter();
    dull.type = "lowpass";
    dull.frequency.value = p.own ? 16000 : Math.max(1800, 14000 - p.distance * 260);
    dull.connect(send);
    setTimeout(() => dull.disconnect(), lifeS * 1000);
    return dull;
  }

  /**
   * A paint marker's shot: no bang, a pneumatic thwup. A burst of air
   * through the barrel (band passed noise), a soft low thump as the ball
   * leaves, and a hiss of gas after. Each gun pitches and sizes it.
   */
  shot(gun: GunId, p: Placed): void {
    const e = this.engine;
    const at = e.now;
    const v = vary(1, 0.07);
    const air = (out: AudioNode, freq: number, decay: number, peak: number) => noise(e, out, at, { filter: "bandpass", frequency: freq * v, q: 1.4, sweepTo: freq * 0.55 * v, decay, peak });
    const thump = (out: AudioNode, freq: number, decay: number, peak: number) => tone(e, out, at, { frequency: freq * v, glideTo: freq * 0.45, decay, peak });
    const hiss = (out: AudioNode, delay: number, decay: number, peak: number) => noise(e, out, at + delay, { filter: "highpass", frequency: 5200, attack: 0.01, decay, peak });
    switch (gun) {
      case "rifle": {
        const out = this.out(p, 0.8);
        air(out, 1250, 0.07, 0.55);
        thump(out, 190, 0.08, 0.5);
        hiss(out, 0.02, 0.12, 0.07);
        return;
      }
      case "shotgun": {
        const out = this.out(p, 1, 3);
        air(out, 820, 0.14, 0.75);
        noise(e, out, at, { filter: "lowpass", frequency: 900 * v, decay: 0.16, peak: 0.45 });
        thump(out, 120, 0.16, 0.75);
        hiss(out, 0.04, 0.3, 0.1);
        this.pump(p, at + 0.36);
        return;
      }
      case "smg": {
        const out = this.out(p, 0.7);
        air(out, 1550, 0.05, 0.45);
        thump(out, 240, 0.05, 0.35);
        hiss(out, 0.01, 0.06, 0.05);
        return;
      }
      case "sniper": {
        const out = this.out(p, 1, 4);
        // A long barrel: a sharper crack of air, a deeper thump and a longer hiss.
        noise(e, out, at, { filter: "highpass", frequency: 2600 * v, decay: 0.03, peak: 0.4 });
        air(out, 950, 0.12, 0.7);
        thump(out, 150, 0.14, 0.7);
        hiss(out, 0.03, 0.45, 0.1);
        this.bolt(p, at + 0.55);
        return;
      }
    }
  }

  /** The pump racked back and forward. */
  pump(p: Placed, at = this.engine.now): void {
    const out = this.out(p, 0.7);
    noise(this.engine, out, at, { filter: "bandpass", frequency: 1600, q: 2.5, decay: 0.05, peak: 0.35 });
    noise(this.engine, out, at + 0.17, { filter: "bandpass", frequency: 2100, q: 2.5, decay: 0.05, peak: 0.4 });
    tone(this.engine, out, at + 0.17, { type: "triangle", frequency: 900, decay: 0.03, peak: 0.1 });
  }

  /** The sniper's bolt: up, back, forward, down. */
  bolt(p: Placed, at = this.engine.now): void {
    const out = this.out(p, 0.7);
    const click = (t: number, f: number, peak: number) => noise(this.engine, out, at + t, { filter: "bandpass", frequency: f, q: 3, decay: 0.035, peak });
    click(0, 2600, 0.3);
    click(0.09, 1500, 0.35);
    click(0.24, 1800, 0.35);
    click(0.32, 2900, 0.3);
  }

  /** The hollow click of a trigger on an empty chamber. */
  dry(p: Placed): void {
    const out = this.out(p, 0.9);
    tone(this.engine, out, this.engine.now, { type: "square", frequency: 2600, decay: 0.012, peak: 0.22 });
    noise(this.engine, out, this.engine.now, { filter: "bandpass", frequency: 3400, q: 3, decay: 0.03, peak: 0.3 });
  }

  /** A reload, timed to the animation: magazine out, in, and the handle or bolt. The shotgun loads shell by shell instead. */
  reload(gun: GunId, seconds: number, p: Placed): void {
    const e = this.engine;
    const out = this.out(p, 0.85, seconds + 1);
    const at = e.now;
    if (gun === "shotgun") {
      noise(e, out, at, { filter: "bandpass", frequency: 1200, q: 2, decay: 0.06, peak: 0.2 });
      return;
    }
    if (gun === "sniper") this.bolt(p, at + 0.05);
    const start = gun === "sniper" ? 0.4 : 0.1;
    // Out: the release, a slide and a clack.
    noise(e, out, at + start, { filter: "bandpass", frequency: 3000, q: 3, decay: 0.02, peak: 0.25 });
    noise(e, out, at + start + 0.05, { filter: "bandpass", frequency: 1400, q: 1.5, sweepTo: 700, decay: 0.12, peak: 0.28 });
    // In: seated with a solid clack.
    const seat = at + seconds * 0.6;
    noise(e, out, seat, { filter: "bandpass", frequency: 1900, q: 2, decay: 0.05, peak: 0.45 });
    tone(e, out, seat, { type: "square", frequency: 330, decay: 0.03, peak: 0.08 });
    if (gun === "sniper") return this.bolt(p, at + seconds * 0.82);
    // The charging handle, back and home.
    const handle = at + seconds * 0.85;
    noise(e, out, handle, { filter: "bandpass", frequency: 2600, q: 3, decay: 0.04, peak: 0.38 });
    noise(e, out, handle + 0.1, { filter: "bandpass", frequency: 1800, q: 3, decay: 0.05, peak: 0.42 });
  }

  /** One shell pushed into the shotgun's tube. */
  shell(p: Placed): void {
    const out = this.out(p, 0.8);
    noise(this.engine, out, this.engine.now, { filter: "bandpass", frequency: 2400, q: 3, decay: 0.035, peak: 0.34 });
    tone(this.engine, out, this.engine.now + 0.02, { type: "triangle", frequency: 1250, decay: 0.03, peak: 0.08 });
  }
}
