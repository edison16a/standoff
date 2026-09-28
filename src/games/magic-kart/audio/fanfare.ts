import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/** The winner's fanfare: a bright rising run into a held major chord. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [60, 64, 67, 72, 76, 79].forEach((note, i) => {
    tone(engine, out, at + i * 0.1, { type: "triangle", frequency: midi(note), attack: 0.01, decay: 0.25, peak: 0.1 });
    tone(engine, out, at + i * 0.1, { frequency: midi(note + 12), attack: 0.01, decay: 0.25, peak: 0.05 });
  });
  const held = at + 0.65;
  for (const note of [72, 76, 79, 84]) {
    tone(engine, out, held, { type: "sawtooth", frequency: midi(note), attack: 0.03, decay: 2.2, peak: 0.02 });
    tone(engine, out, held, { type: "triangle", frequency: midi(note), attack: 0.03, decay: 2.4, peak: 0.035, detune: 6 });
  }
  tone(engine, out, held, { frequency: midi(48), attack: 0.02, decay: 2.4, peak: 0.2 });
  tone(engine, out, held, { frequency: 150, glideTo: 45, decay: 0.3, peak: 0.25 });
  noise(engine, out, held, { filter: "highpass", frequency: 6000, decay: 1.5, peak: 0.1 });
}
