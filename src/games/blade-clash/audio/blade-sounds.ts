import type { CharacterId } from "@/games/blade-clash/characters";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise, tone } from "../../../platform/audio/voices";
import { vary } from "./mix";

/** How each fighter's weapon sounds. */
export type BladeVoice = "longsword" | "katana" | "pixel" | "energy";

export const BLADE_VOICE: Record<CharacterId, BladeVoice> = { knight: "longsword", samurai: "katana", block: "pixel", star: "energy" };

/** A square wave stepping down in pitch, the way an old game's sound chip would. */
function chip(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], stepS: number, peak: number): void {
  notes.forEach((frequency, i) => tone(engine, out, at + i * stepS, { type: "square", frequency, decay: stepS * 1.2, peak }));
}

/** The swish of a blade cutting the air, bigger for a faster swing (`strength` 0 to 1). */
export function whoosh(engine: AudioEngine, out: AudioNode, voice: BladeVoice, strength: number): void {
  const at = engine.now;
  const s = strength;
  if (voice === "longsword") {
    // Broad and heavy: a low rush with a hint of the blade's weight.
    const f = vary(520 + 380 * s, 0.1);
    noise(engine, out, at, { filter: "bandpass", frequency: f, sweepTo: f * 3.2, q: 1.1, attack: 0.03, decay: vary(0.2 + 0.08 * s, 0.1), peak: 0.35 + 0.35 * s });
    tone(engine, out, at, { frequency: 150, glideTo: 95, attack: 0.03, decay: 0.16, peak: 0.08 * s });
  } else if (voice === "katana") {
    // Thin and fast: a sharp high whistle.
    const f = vary(1400 + 900 * s, 0.1);
    noise(engine, out, at, { filter: "bandpass", frequency: f, sweepTo: f * 3, q: 2.2, attack: 0.012, decay: vary(0.12 + 0.05 * s, 0.1), peak: 0.32 + 0.35 * s });
    noise(engine, out, at, { filter: "highpass", frequency: 6500, attack: 0.01, decay: 0.07, peak: 0.12 + 0.1 * s });
  } else if (voice === "pixel") {
    chip(engine, out, at, [880, 660, 440, 330].map((f) => f * (0.9 + 0.3 * s)), 0.028, 0.035 + 0.03 * s);
    noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 1, attack: 0.01, decay: 0.08, peak: 0.12 * s });
  } else {
    // The blade of light swings with a deep rising drone.
    tone(engine, out, at, { type: "sawtooth", frequency: 95, glideTo: 160 + 60 * s, attack: 0.04, decay: 0.28, peak: 0.1 + 0.1 * s });
    tone(engine, out, at, { frequency: 190, glideTo: 300, attack: 0.04, decay: 0.24, peak: 0.08 + 0.06 * s });
    noise(engine, out, at, { filter: "bandpass", frequency: 900, sweepTo: 2400, q: 1.4, attack: 0.03, decay: 0.2, peak: 0.12 + 0.15 * s });
  }
}

/** Two blades meeting. Steel rings, light crackles, pixels chime; a mixed pair layers both. */
export function clash(engine: AudioEngine, out: AudioNode, wet: AudioNode, voices: readonly BladeVoice[], strength: number): void {
  const at = engine.now;
  const loud = 0.6 + 0.6 * strength;
  const steel = voices.filter((v) => v === "longsword" || v === "katana").length;
  noise(engine, out, at, { filter: "highpass", frequency: 3000, decay: 0.05, peak: 0.4 * loud });
  if (steel > 0) {
    // A bright strike and a few inharmonic partials ringing round the arena; a katana rings higher.
    const pitch = vary(voices.includes("katana") ? 1.18 : 1, 0.04);
    const ring = steel / 2 + 0.5;
    for (const [frequency, peak, decay] of [[1870, 0.13, 0.7], [2553, 0.1, 0.55], [3411, 0.07, 0.45], [4987, 0.04, 0.3]] as const) {
      tone(engine, out, at, { frequency: frequency * pitch, decay, peak: peak * loud * ring });
      tone(engine, wet, at, { frequency: frequency * pitch, decay: decay * 1.4, peak: peak * 0.6 * loud * ring });
    }
  }
  if (voices.includes("energy")) {
    // Crackling light: a burst of tiny snaps over a falling zap and an angry buzz.
    for (let i = 0; i < 7; i++) noise(engine, out, at + Math.random() * 0.14, { filter: "highpass", frequency: 2500 + Math.random() * 3000, decay: 0.02, peak: 0.22 * loud });
    tone(engine, out, at, { type: "sawtooth", frequency: 1500, glideTo: 180, decay: 0.22, peak: 0.07 * loud });
    tone(engine, out, at, { type: "sawtooth", frequency: 62, decay: 0.35, peak: 0.12 * loud });
  }
  if (voices.includes("pixel")) chip(engine, out, at, [1320, 1760, 2640], 0.03, 0.05 * loud);
}

/** The blade's part in a hit landing: a slash of steel, a sizzle of light, or a chip tune ouch. */
export function strike(engine: AudioEngine, out: AudioNode, voice: BladeVoice): void {
  const at = engine.now;
  if (voice === "energy") {
    noise(engine, out, at, { filter: "bandpass", frequency: 3200, q: 0.8, attack: 0.005, decay: 0.35, peak: 0.28 });
    tone(engine, out, at, { type: "sawtooth", frequency: 240, glideTo: 90, decay: 0.3, peak: 0.08 });
  } else if (voice === "pixel") {
    chip(engine, out, at, [660, 330, 220], 0.05, 0.06);
  } else {
    noise(engine, out, at, { filter: "highpass", frequency: voice === "katana" ? 4200 : 3000, decay: 0.09, peak: 0.26 });
    tone(engine, out, at, { frequency: voice === "katana" ? 3100 : 2500, glideTo: 1900, decay: 0.12, peak: 0.05 });
  }
}
