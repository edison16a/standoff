import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { drive, sendTo } from "./nodes";

/** Where a sound comes from, relative to the team: metres right and metres ahead. */
export interface Spot {
  side: number;
  ahead: number;
}

/** Louder as it comes close, and panned toward its side. */
export function placement(spot: Spot): { gain: number; pan: number } {
  const distance = Math.hypot(spot.side, spot.ahead);
  return { gain: 1 / (1 + distance / 5), pan: Math.max(-0.9, Math.min(0.9, spot.side / Math.max(3, spot.ahead))) };
}

/**
 * The zombies' voices and the sound of hitting them. A growl is a buzzy
 * low voice pushed through two vocal formants, with a rasp of breath and
 * a wobble, so no two sound quite alike.
 */
export class ZombieSounds {
  constructor(private readonly engine: AudioEngine) {}

  /** `pitch` 1 is a man sized zombie. Bosses go far lower and longer. */
  growl(spot: Spot, pitch = 1, length = 1, loud = 1): void {
    const e = this.engine;
    const { ctx } = e;
    const at = e.now;
    const place = placement(spot);
    const dur = (0.7 + Math.random() * 0.9) * length;
    const out = sendTo(e, e.bus("crowd"), place.gain * 0.55 * loud, place.pan, at, dur + 1);

    const voice = ctx.createOscillator();
    voice.type = "sawtooth";
    const base = (70 + Math.random() * 45) * pitch;
    voice.frequency.setValueAtTime(base * 1.15, at);
    voice.frequency.linearRampToValueAtTime(base * 0.8, at + dur);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 5 + Math.random() * 4;
    const depth = ctx.createGain();
    depth.gain.value = base * 0.12;
    wobble.connect(depth).connect(voice.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(1, at + 0.12);
    env.gain.setTargetAtTime(0.0001, at + dur * 0.7, dur * 0.12);
    const grit = drive(e, 4);
    voice.connect(grit).connect(env);
    for (const [f, q, g] of [[480 * pitch, 3, 0.8], [1150 * pitch, 5, 0.35]] as const) {
      const formant = ctx.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.value = f * (0.9 + Math.random() * 0.2);
      formant.Q.value = q;
      const level = ctx.createGain();
      level.gain.value = g;
      env.connect(formant).connect(level).connect(out);
    }
    noise(e, out, at, { filter: "bandpass", frequency: 900 * pitch, q: 1.2, attack: 0.1, decay: dur * 0.8, peak: 0.25 });
    voice.start(at);
    wobble.start(at);
    voice.stop(at + dur + 0.6);
    wobble.stop(at + dur + 0.6);
    voice.onended = () => env.disconnect();
  }

  /** A bullet into flesh. Head shots add a crunch. */
  flesh(spot: Spot, head: boolean): void {
    const e = this.engine;
    const place = placement(spot);
    const out = sendTo(e, e.bus("sfx"), 0.4 + place.gain * 0.5, place.pan);
    noise(e, out, e.now, { filter: "bandpass", frequency: 650, q: 1.3, decay: 0.12, peak: 0.6 });
    tone(e, out, e.now, { type: "sine", frequency: 210, glideTo: 70, decay: 0.08, peak: 0.4 });
    if (head) noise(e, out, e.now + 0.01, { filter: "highpass", frequency: 1700, decay: 0.06, peak: 0.5 });
  }

  /** A bullet off armour or a boss's hide: a bright ring. */
  ping(spot: Spot): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), 0.5, placement(spot).pan);
    tone(e, out, e.now, { type: "sine", frequency: 2350 + Math.random() * 400, decay: 0.22, peak: 0.25 });
    tone(e, out, e.now, { type: "sine", frequency: 3900, decay: 0.12, peak: 0.12 });
    noise(e, out, e.now, { filter: "highpass", frequency: 3500, decay: 0.04, peak: 0.4 });
  }

  /** A weak point hit: a wet burst and a sizzle. Breaking it adds a pop. */
  weak(spot: Spot, broke: boolean): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), 0.8, placement(spot).pan);
    noise(e, out, e.now, { filter: "bandpass", frequency: 500, q: 1, decay: 0.16, peak: 0.7 });
    noise(e, out, e.now, { filter: "highpass", frequency: 4200, decay: broke ? 0.6 : 0.2, peak: 0.25 });
    if (broke) {
      tone(e, out, e.now, { type: "sine", frequency: 140, glideTo: 40, decay: 0.4, peak: 0.9 });
      this.growl(spot, 0.45, 1.6, 1.6);
    }
  }

  /** The body hits the ground. */
  fall(spot: Spot, heavy: boolean): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), placement(spot).gain * (heavy ? 1.6 : 0.9), placement(spot).pan, e.now, 3);
    const at = e.now + (heavy ? 0.9 : 0.55);
    tone(e, out, at, { type: "sine", frequency: heavy ? 55 : 95, glideTo: 35, decay: heavy ? 0.5 : 0.18, peak: 0.8 });
    noise(e, out, at, { filter: "lowpass", frequency: heavy ? 400 : 900, decay: heavy ? 0.6 : 0.2, peak: 0.5 });
  }

  /** A swipe that landed on the team: a heavy thud and a grunt. */
  swipe(spot: Spot, heavy: boolean): void {
    const e = this.engine;
    const out = sendTo(e, e.bus("sfx"), 0.9, placement(spot).pan);
    noise(e, out, e.now, { filter: "bandpass", frequency: 1800, q: 0.8, sweepTo: 500, decay: 0.12, peak: 0.4 });
    tone(e, out, e.now + 0.05, { type: "sine", frequency: heavy ? 70 : 110, glideTo: 45, decay: 0.25, peak: 0.9 });
    tone(e, out, e.now + 0.07, { type: "triangle", frequency: 190, glideTo: 130, decay: 0.2, peak: 0.25 });
  }

  /** A boss's foot coming down: a deep thump you feel more than hear. */
  stomp(spot: Spot): void {
    const e = this.engine;
    const place = placement(spot);
    const out = sendTo(e, e.bus("sfx"), 0.35 + place.gain * 1.2, place.pan);
    tone(e, out, e.now, { type: "sine", frequency: 48, glideTo: 28, decay: 0.35, peak: 0.9 });
    noise(e, out, e.now, { filter: "lowpass", frequency: 180, decay: 0.25, peak: 0.5 });
  }

  /** Dragging feet close by. */
  shuffle(spot: Spot): void {
    const e = this.engine;
    const place = placement(spot);
    const out = sendTo(e, e.bus("crowd"), place.gain * 0.35, place.pan);
    noise(e, out, e.now, { filter: "bandpass", frequency: 1100, q: 0.9, attack: 0.04, decay: 0.2, peak: 0.4 });
  }
}
