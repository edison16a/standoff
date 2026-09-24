import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { sendTo } from "./nodes";

/**
 * One off moments: the radio squelch and murmur, achievement chimes, the
 * checkpoint sting, the crash, the ship's horn and the two endings.
 */
export class Stingers {
  constructor(private readonly engine: AudioEngine) {}

  /**
   * A radio call: a squelch, crackle, and a band limited murmur that
   * rises and falls like speech, for about as long as the line takes to
   * read. The words themselves are on screen.
   */
  radio(chars: number): void {
    const e = this.engine;
    const { ctx } = e;
    const at = e.now;
    const length = Math.min(4.5, 0.8 + chars * 0.045);
    const out = sendTo(e, e.bus("ui"), 0.9, -0.2, at, length + 1);
    tone(e, out, at, { type: "sine", frequency: 1350, decay: 0.08, peak: 0.25 });
    noise(e, out, at + 0.05, { filter: "bandpass", frequency: 2200, q: 0.7, decay: 0.25, peak: 0.35 });
    for (let t = 0.15; t < length; t += 0.08 + Math.random() * 0.25) {
      noise(e, out, at + t, { filter: "bandpass", frequency: 1500 + Math.random() * 2500, q: 2, decay: 0.02, peak: 0.12 });
    }
    const voice = ctx.createOscillator();
    voice.type = "sawtooth";
    voice.frequency.value = 125;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1100;
    band.Q.value = 1.4;
    const env = ctx.createGain();
    env.gain.value = 0;
    // Syllables: short swells of level and pitch.
    let t = at + 0.25;
    while (t < at + length - 0.2) {
      const syllable = 0.09 + Math.random() * 0.12;
      env.gain.setTargetAtTime(0.08 + Math.random() * 0.05, t, 0.02);
      env.gain.setTargetAtTime(0.0, t + syllable, 0.03);
      voice.frequency.setTargetAtTime(110 + Math.random() * 50, t, 0.03);
      t += syllable + 0.04 + (Math.random() < 0.15 ? 0.2 : 0);
    }
    voice.connect(band).connect(env).connect(out);
    voice.start(at);
    voice.stop(at + length);
    voice.onended = () => env.disconnect();
    tone(e, out, at + length, { type: "sine", frequency: 1050, decay: 0.08, peak: 0.2 });
  }

  achievement(): void {
    const e = this.engine;
    const out = e.bus("ui");
    [72, 76, 79, 84].forEach((note, i) => tone(e, out, e.now + i * 0.07, { type: "triangle", frequency: midi(note), decay: 0.4, peak: 0.22 }));
  }

  checkpoint(): void {
    const e = this.engine;
    const out = e.bus("music");
    for (const note of [48, 55, 60, 63]) tone(e, out, e.now, { type: "triangle", frequency: midi(note), attack: 0.05, decay: 2.2, peak: 0.08 });
  }

  bossArrives(): void {
    const e = this.engine;
    const out = e.bus("music");
    tone(e, out, e.now, { type: "sawtooth", frequency: midi(29), attack: 0.3, decay: 3, peak: 0.12 });
    tone(e, out, e.now, { type: "sawtooth", frequency: midi(30), attack: 0.3, decay: 3, peak: 0.1 });
    noise(e, out, e.now, { filter: "lowpass", frequency: 200, attack: 0.2, decay: 2, peak: 0.3 });
  }

  explosion(delayS = 0): void {
    const e = this.engine;
    const at = e.now + delayS;
    const out = sendTo(e, e.bus("sfx"), 1, 0.3, at, 5);
    noise(e, out, at, { filter: "lowpass", frequency: 500, sweepTo: 120, attack: 0.01, decay: 2.6, peak: 1 });
    tone(e, out, at, { type: "sine", frequency: 60, glideTo: 24, decay: 1.6, peak: 1 });
    noise(e, out, at, { filter: "highpass", frequency: 2500, decay: 0.3, peak: 0.4 });
  }

  horn(delayS = 0): void {
    const e = this.engine;
    const at = e.now + delayS;
    for (const f of [69, 69.6, 103.5]) tone(e, e.bus("sfx"), at, { type: "sawtooth", frequency: f, attack: 0.25, decay: 3.2, peak: 0.12 });
  }

  gameOver(): void {
    const e = this.engine;
    const out = e.bus("music");
    [55, 51, 48, 43].forEach((note, i) => tone(e, out, e.now + i * 0.45, { type: "sawtooth", frequency: midi(note - 12), attack: 0.1, decay: 1.6, peak: 0.08 }));
  }

  victory(): void {
    const e = this.engine;
    const out = e.bus("music");
    [60, 64, 67, 72, 76].forEach((note, i) => tone(e, out, e.now + i * 0.18, { type: "triangle", frequency: midi(note), attack: 0.02, decay: 2.5, peak: 0.12 }));
  }
}
