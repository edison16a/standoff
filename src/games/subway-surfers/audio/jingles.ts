import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { PowerKind } from "../engine/types";
import { midi, noise, tone } from "./voices";

/**
 * A short sound of its own for each power up, laid over the shared
 * rising arpeggio, so players know by ear which one they grabbed.
 */
export function signature(engine: AudioEngine, out: AudioNode, at: number, kind: PowerKind): void {
  switch (kind) {
    case "jetpack":
      // Ignition: a low roar that swells and lifts.
      noise(engine, out, at, { filter: "lowpass", frequency: 300, sweepTo: 1500, attack: 0.15, decay: 0.7, peak: 0.3 });
      tone(engine, out, at, { frequency: 55, glideTo: 95, attack: 0.1, decay: 0.6, peak: 0.25 });
      return;
    case "boots":
      // A spring: a boing that bounces up.
      tone(engine, out, at, { frequency: 180, glideTo: 760, decay: 0.32, peak: 0.14 });
      tone(engine, out, at + 0.12, { type: "triangle", frequency: 300, glideTo: 1100, decay: 0.25, peak: 0.05 });
      return;
    case "magnet":
      // A hum that beats against itself, then the zap of it switching on.
      tone(engine, out, at, { type: "triangle", frequency: 110, attack: 0.05, decay: 0.55, peak: 0.12 });
      tone(engine, out, at, { type: "triangle", frequency: 116, attack: 0.05, decay: 0.55, peak: 0.1 });
      noise(engine, out, at + 0.05, { filter: "bandpass", frequency: 3200, sweepTo: 700, q: 3, decay: 0.16, peak: 0.08 });
      return;
    case "hoverboard":
      // A surfy swell of air and a warm hum under it.
      noise(engine, out, at, { filter: "bandpass", frequency: 350, sweepTo: 2400, q: 1.5, attack: 0.18, decay: 0.3, peak: 0.16 });
      tone(engine, out, at, { type: "triangle", frequency: midi(57), attack: 0.1, decay: 0.5, peak: 0.08 });
      return;
    case "double":
      // A cash bell: two bright rings as the points double.
      tone(engine, out, at + 0.26, { frequency: midi(96), decay: 0.45, peak: 0.05 });
      tone(engine, out, at + 0.33, { frequency: midi(100), decay: 0.6, peak: 0.045 });
      noise(engine, out, at + 0.26, { filter: "bandpass", frequency: 4200, q: 3, decay: 0.03, peak: 0.06 });
      return;
  }
}
