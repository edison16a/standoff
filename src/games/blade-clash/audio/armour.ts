import type { CharacterId } from "@/games/blade-clash/characters";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise, tone } from "../../../platform/audio/voices";
import { vary } from "./mix";

/**
 * What each fighter's armour sounds like when they move and when they
 * are struck: the Knight's plate clanks and jingles, the Samurai's
 * lacquered plates knock and rattle on their cords, the Block Hero goes
 * bonk like a wooden toy, and the Star Knight's shell rings with a faint
 * electric crackle.
 */

/** A footstep, with the armour moving on it. `weight` rises with walking speed. */
export function footstep(engine: AudioEngine, out: AudioNode, character: CharacterId, weight: number): void {
  const at = engine.now;
  const w = 0.5 + 0.5 * weight;
  if (character === "knight") {
    noise(engine, out, at, { filter: "lowpass", frequency: 420, decay: 0.07, peak: 0.18 * w });
    // Plates jingling against each other.
    for (let i = 0; i < 3; i++) tone(engine, out, at + 0.01 + Math.random() * 0.05, { frequency: vary(2600 + i * 900, 0.15), decay: 0.07, peak: 0.018 * w });
  } else if (character === "samurai") {
    noise(engine, out, at, { filter: "bandpass", frequency: 900, q: 1.2, decay: 0.05, peak: 0.12 * w });
    for (let i = 0; i < 3; i++) noise(engine, out, at + 0.015 + i * 0.022, { filter: "bandpass", frequency: vary(1600, 0.2), q: 5, decay: 0.02, peak: 0.06 * w });
  } else if (character === "block") {
    tone(engine, out, at, { type: "square", frequency: vary(200, 0.08), glideTo: 150, decay: 0.05, peak: 0.03 * w });
  } else {
    noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 2, decay: 0.035, peak: 0.1 * w });
    tone(engine, out, at, { frequency: 520, glideTo: 780, decay: 0.08, peak: 0.012 * w });
  }
}

/** The armour taking a blow. */
export function armourHit(engine: AudioEngine, out: AudioNode, character: CharacterId): void {
  const at = engine.now;
  if (character === "knight") {
    for (const [f, peak, decay] of [[820, 0.14, 0.22], [1270, 0.1, 0.18], [1930, 0.07, 0.15], [2710, 0.05, 0.12]] as const) {
      tone(engine, out, at, { frequency: vary(f, 0.03), decay, peak });
    }
    noise(engine, out, at, { filter: "bandpass", frequency: 1500, q: 1.5, decay: 0.08, peak: 0.25 });
  } else if (character === "samurai") {
    // A hard knock on lacquer, then the lames rattling on their lacing.
    noise(engine, out, at, { filter: "bandpass", frequency: 1150, q: 4, decay: 0.06, peak: 0.35 });
    tone(engine, out, at, { frequency: 520, glideTo: 380, decay: 0.08, peak: 0.12 });
    for (let i = 0; i < 6; i++) noise(engine, out, at + 0.03 + i * 0.024, { filter: "bandpass", frequency: vary(1800, 0.25), q: 6, decay: 0.02, peak: 0.12 * (1 - i / 7) });
  } else if (character === "block") {
    tone(engine, out, at, { frequency: 330, glideTo: 140, decay: 0.14, peak: 0.28 });
    tone(engine, out, at, { type: "square", frequency: 165, decay: 0.06, peak: 0.05 });
    noise(engine, out, at, { filter: "bandpass", frequency: 700, q: 2, decay: 0.05, peak: 0.2 });
  } else {
    tone(engine, out, at, { frequency: 1400, glideTo: 900, decay: 0.2, peak: 0.08 });
    for (let i = 0; i < 4; i++) noise(engine, out, at + Math.random() * 0.1, { filter: "highpass", frequency: 4000, decay: 0.015, peak: 0.12 });
    noise(engine, out, at, { filter: "lowpass", frequency: 900, decay: 0.1, peak: 0.25 });
  }
}
