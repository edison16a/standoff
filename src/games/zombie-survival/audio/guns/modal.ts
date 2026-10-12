import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone, type NoiseOptions } from "@/platform/audio/voices";

/**
 * Synthesised metal. A struck gun part rings at a few inharmonic
 * frequencies (its modes) for a few hundredths of a second, under a burst
 * of filtered noise for the scrape or impact itself. Layering the two is
 * what turns a hiss into a click, a clack or a slam.
 */

/** The ringing modes of a part, in Hz. Higher modes die faster and quieter. */
export interface Ring {
  modes: readonly number[];
  decay: number;
  peak: number;
}

/** A low, falling sine for the weight behind an impact. */
export interface Thump {
  frequency: number;
  glideTo?: number;
  decay: number;
  peak: number;
}

export interface Clank {
  noise?: readonly NoiseOptions[];
  ring?: Ring;
  thump?: Thump;
}

/**
 * Plays one clank at `at`. `pitch` scales every frequency (bigger parts
 * ring lower) and `level` every peak, and each call detunes the modes a
 * touch so no two clicks are identical.
 */
export function clank(engine: AudioEngine, out: AudioNode, at: number, spec: Clank, pitch = 1, level = 1): void {
  for (const n of spec.noise ?? []) {
    noise(engine, out, at, {
      ...n,
      frequency: n.frequency * pitch,
      sweepTo: n.sweepTo ? n.sweepTo * pitch : undefined,
      peak: n.peak * level,
      attack: n.attack ?? 0.0008,
    });
  }
  if (spec.ring) {
    const { modes, decay, peak } = spec.ring;
    modes.forEach((f, i) => {
      const detune = 1 + (Math.random() - 0.5) * 0.03;
      tone(engine, out, at, { frequency: f * pitch * detune, attack: 0.0005, decay: decay / (1 + i * 0.4), peak: (peak * level) / (1 + i * 0.6) });
    });
  }
  if (spec.thump) {
    const { frequency, glideTo, decay, peak } = spec.thump;
    tone(engine, out, at, { frequency: frequency * pitch, glideTo: glideTo ? glideTo * pitch : undefined, attack: 0.001, decay, peak: peak * level });
  }
}
