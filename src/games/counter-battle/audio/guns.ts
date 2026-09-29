import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import type { GunId } from "../engine/guns";
import { sendTo, vary, type Placed } from "./mix";

/** One marker's voice: how deep its thwup is, how long, and how much air hisses out after. */
interface Thwup {
  gain: number;
  /** The hollow pop's pitch, which rises a little as the ball leaves: the "up". */
  pitch: number;
  /** Where the rush of air starts and sweeps to, Hz. */
  air: [number, number];
  length: number;
  hiss: number;
}

const VOICES: Record<GunId, Thwup> = {
  rifle: { gain: 0.85, pitch: 150, air: [700, 1900], length: 0.075, hiss: 0.07 },
  smg: { gain: 0.7, pitch: 185, air: [900, 2300], length: 0.055, hiss: 0.045 },
  shotgun: { gain: 1, pitch: 110, air: [450, 1400], length: 0.11, hiss: 0.11 },
  sniper: { gain: 1, pitch: 125, air: [550, 1700], length: 0.1, hiss: 0.14 },
};

/**
 * Every marker sound, synthesised. A paintball marker has no bang: each
 * shot is a pneumatic thwup, a rush of air with a hollow pop that rises
 * as the ball leaves, then a short hiss. Each gun has its own depth and
 * length, the scatter pump racks after each shot and the scope marker
 * works its bolt. Far shots lose their top, so distance is heard too.
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
    const voice = VOICES[gun];
    const v = vary(1, 0.05);
    const out = this.out(p, voice.gain);
    // The rush of air through the valve, sweeping up as the ball goes.
    noise(e, out, at, { filter: "bandpass", frequency: voice.air[0] * v, sweepTo: voice.air[1] * v, q: 1.3, decay: voice.length, peak: 0.55 });
    // The hollow pop, rising: thw then up.
    tone(e, out, at, { frequency: voice.pitch * v, glideTo: voice.pitch * 1.6 * v, decay: voice.length * 0.9, peak: 0.5 });
    tone(e, out, at, { type: "triangle", frequency: voice.pitch * 2.02 * v, glideTo: voice.pitch * 3 * v, decay: voice.length * 0.5, peak: 0.12 });
    // A soft thump in the body of the marker.
    noise(e, out, at, { filter: "lowpass", frequency: 380, decay: 0.04, peak: 0.35 });
    // The last of the air hisses out of the barrel.
    noise(e, out, at + 0.02, { filter: "highpass", frequency: 5200, attack: 0.008, decay: voice.hiss, peak: 0.07 });
    if (gun === "shotgun") this.pump(p, at + 0.36);
    if (gun === "sniper") this.bolt(p, at + 0.55);
  }

  /** A ball bursting where it lands: a wet pop and a slap, dulled by distance like any other sound. */
  pop(p: Placed, soft = false): void {
    const e = this.engine;
    const out = this.out(p, soft ? 0.35 : 0.55, 1.5);
    const at = e.now;
    tone(e, out, at, { frequency: vary(820, 0.15), glideTo: 260, decay: 0.03, peak: 0.4 });
    noise(e, out, at, { filter: "bandpass", frequency: vary(1700, 0.2), q: 1.1, decay: 0.05, peak: 0.45 });
    noise(e, out, at + 0.008, { filter: "lowpass", frequency: 900, decay: 0.06, peak: soft ? 0.15 : 0.3 });
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
