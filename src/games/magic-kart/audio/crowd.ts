import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";

/**
 * The grandstands. A cheer is a handful of buzzy voices, each pushed
 * through a vowel formant and gliding up then down like a shout, over a
 * breathy roar. Applause is hundreds of tiny filtered claps. Both are
 * random every time, so no two crowds sound alike.
 */

export interface CheerOptions {
  /** 1 is a full grandstand, 0.3 a few fans. */
  size: number;
  length: number;
  pan?: number;
}

export function cheer(engine: AudioEngine, out: AudioNode, at: number, { size, length, pan = 0 }: CheerOptions): void {
  const { ctx } = engine;
  const stage = ctx.createStereoPanner();
  stage.pan.value = pan;
  stage.connect(out);
  const voices = Math.max(3, Math.round(10 * size));
  for (let i = 0; i < voices; i++) shout(engine, stage, at + Math.random() * 0.25, length * (0.6 + Math.random() * 0.4), size);
  // The roar under the voices: wide band noise that swells and fades with the shouts.
  noise(engine, stage, at, { filter: "bandpass", frequency: 1100, q: 0.5, attack: 0.25, decay: length, peak: 0.4 * size });
  noise(engine, stage, at, { filter: "lowpass", frequency: 500, attack: 0.3, decay: length * 0.8, peak: 0.2 * size });
  setTimeout(() => stage.disconnect(), (at - engine.now + length + 1.5) * 1000);
}

/** One fan: a buzzy voice through an "ah" or "oh" formant, rising into the shout then falling away. */
function shout(engine: AudioEngine, out: AudioNode, at: number, length: number, size: number): void {
  const { ctx } = engine;
  const voice = ctx.createOscillator();
  voice.type = "sawtooth";
  const base = Math.random() < 0.5 ? 150 + Math.random() * 90 : 260 + Math.random() * 140;
  voice.frequency.setValueAtTime(base, at);
  voice.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.3), at + 0.25);
  voice.frequency.exponentialRampToValueAtTime(base * 0.85, at + length);
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 4 + Math.random() * 3;
  const depth = ctx.createGain();
  depth.gain.value = base * 0.03;
  vibrato.connect(depth).connect(voice.frequency);
  const formant = ctx.createBiquadFilter();
  formant.type = "bandpass";
  formant.frequency.value = 650 + Math.random() * 500;
  formant.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime((0.13 + Math.random() * 0.07) * Math.min(1, size + 0.3), at + 0.12 + Math.random() * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  voice.connect(formant).connect(gain).connect(out);
  voice.start(at);
  vibrato.start(at);
  voice.stop(at + length + 0.05);
  vibrato.stop(at + length + 0.05);
  voice.onended = () => gain.disconnect();
}

/** Hands clapping: a dense patter that thins out as people stop. */
export function applause(engine: AudioEngine, out: AudioNode, at: number, length: number, density = 1): void {
  const claps = Math.round(length * 40 * density);
  for (let i = 0; i < claps; i++) {
    // Squared, so most claps land early and the tail thins out.
    const t = at + Math.pow(Math.random(), 1.6) * length;
    const fade = 1 - (t - at) / length;
    noise(engine, out, t, { filter: "bandpass", frequency: 1200 + Math.random() * 1600, q: 1.4, attack: 0.002, decay: 0.03 + Math.random() * 0.03, peak: (0.14 + Math.random() * 0.12) * (0.3 + fade * 0.7) });
  }
}
