import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { GunId } from "../engine/guns";
import { sendTo, vary, type Placed } from "./mix";

/**
 * Every gun sound, synthesised, each gun with its own voice: the rifle a
 * clean crack, the shotgun a deep boom and a pump, the SMG a quick snap
 * and the sniper a huge crack that rolls round the field before the bolt
 * works. Far shots lose their top, so distance is heard as well as seen.
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

  shot(gun: GunId, p: Placed): void {
    const e = this.engine;
    const at = e.now;
    const v = vary(1, 0.06);
    switch (gun) {
      case "rifle": {
        const out = this.out(p, 0.9);
        noise(e, out, at, { filter: "highpass", frequency: 2400 * v, decay: 0.06, peak: 0.6 });
        noise(e, out, at, { filter: "lowpass", frequency: 1700 * v, decay: 0.15, peak: 0.55 });
        tone(e, out, at, { frequency: 130 * v, glideTo: 50, decay: 0.12, peak: 0.45 });
        noise(e, out, at + 0.09, { filter: "bandpass", frequency: 560 * v, q: 0.8, decay: 0.5, peak: 0.08 });
        return;
      }
      case "shotgun": {
        const out = this.out(p, 1, 4);
        noise(e, out, at, { filter: "highpass", frequency: 2200, decay: 0.05, peak: 0.55 });
        noise(e, out, at, { filter: "lowpass", frequency: 1200 * v, decay: 0.42, peak: 1 });
        tone(e, out, at, { frequency: 74 * v, glideTo: 30, decay: 0.38, peak: 0.9 });
        noise(e, out, at + 0.1, { filter: "bandpass", frequency: 380 * v, q: 0.8, decay: 1, peak: 0.18 });
        this.pump(p, at + 0.36);
        return;
      }
      case "smg": {
        const out = this.out(p, 0.75);
        noise(e, out, at, { filter: "highpass", frequency: 1900 * v, decay: 0.04, peak: 0.5 });
        noise(e, out, at, { filter: "bandpass", frequency: 1050 * v, q: 1.2, decay: 0.07, peak: 0.36 });
        tone(e, out, at, { type: "square", frequency: 210 * v, glideTo: 95, decay: 0.04, peak: 0.1 });
        return;
      }
      case "sniper": {
        const out = this.out(p, 1.1, 5);
        noise(e, out, at, { filter: "highpass", frequency: 3000 * v, decay: 0.09, peak: 0.8 });
        noise(e, out, at, { filter: "lowpass", frequency: 2000 * v, decay: 0.3, peak: 0.85 });
        tone(e, out, at, { frequency: 95 * v, glideTo: 34, decay: 0.45, peak: 0.95 });
        // The crack coming back off the hills, twice.
        noise(e, out, at + 0.22, { filter: "bandpass", frequency: 480, q: 0.7, decay: 1.2, peak: 0.16 });
        noise(e, out, at + 0.55, { filter: "bandpass", frequency: 360, q: 0.7, decay: 1.4, peak: 0.08 });
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
