import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { human } from "./band";

/** The band's drums: a padded bass drum, a snare, a swung ride, brushes and a shaker. */
export const kit = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak = 0.3): void {
    tone(engine, out, at, { frequency: 95, glideTo: 48, decay: 0.2, peak: peak * human() });
  },
  snare(engine: AudioEngine, out: AudioNode, at: number, peak = 0.08): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 2000, q: 0.8, decay: 0.12, peak: peak * human() });
    tone(engine, out, at, { type: "triangle", frequency: 220, glideTo: 180, decay: 0.05, peak: peak * 0.5 });
  },
  /** A ride cymbal, soft and dark, the swing's heartbeat. */
  ride(engine: AudioEngine, out: AudioNode, at: number, peak = 0.02): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 5200, q: 1.5, decay: 0.22, peak: peak * human(0.3) });
    tone(engine, out, at, { frequency: 3100, decay: 0.2, peak: peak * 0.15 });
  },
  brush(engine: AudioEngine, out: AudioNode, at: number, peak = 0.05): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 2600, q: 0.6, attack: 0.012, decay: 0.12, peak: peak * human(0.3) });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak = 0.025): void {
    noise(engine, out, at, { filter: "highpass", frequency: 6500, attack: 0.008, decay: 0.045, peak: peak * human(0.4) });
  },
};
