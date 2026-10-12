import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";
import { CASINGS, type CasingSpec } from "../../ballistics";
import type { WeaponId } from "../../engine/weapons";
import { clinkLevel, type Clink } from "./clinks";
import type { GunBus } from "./gun-bus";
import { CASE_SAMPLES } from "./manifest";
import { clank, type Clank } from "./modal";
import { playSample, type SampleBank } from "./sample-bank";

/**
 * Spent cases hitting the street. Brass rings bright and long, lacquered
 * steel rings lower and stops short, and the shotgun's plastic hull
 * thuds with a little tick from its brass head. Each strike is as loud as
 * the case was fast, so the first bounce clinks and the last ones patter.
 */

/** How each material sounds when there is no recording yet. */
const SYNTH: Record<CasingSpec["material"], Clank> = {
  brass: { noise: [{ filter: "highpass", frequency: 5000, decay: 0.005, peak: 0.12 }], ring: { modes: [4200, 6900, 9800], decay: 0.14, peak: 0.07 } },
  steel: { noise: [{ filter: "highpass", frequency: 3500, decay: 0.006, peak: 0.12 }], ring: { modes: [3100, 5000, 7400], decay: 0.05, peak: 0.07 } },
  hull: { noise: [{ filter: "bandpass", frequency: 520, q: 1, decay: 0.03, peak: 0.5 }], ring: { modes: [2800], decay: 0.02, peak: 0.03 } },
};

/** Smaller cases ring higher: the 9 mm above the 5.56, the stubby 7.62 steel case lowest. */
const PITCH: Record<WeaponId, number> = { shotgun: 1, smg: 1.2, rifle: 1, ak47: 0.88 };

/** A case on asphalt is a small sound next to a gunshot: its loudest strike sits about 20 dB under the bang. */
const LEVEL = 0.16;

/** Quieter strikes than this are lost under the gunfire, so they are not played. */
const AUDIBLE = 0.03;

/** Plays one case's strikes, `clinks` timed from a shot fired at `shotAt`, off to the side its gun throws. */
export function playCasing(engine: AudioEngine, bus: GunBus, bank: SampleBank, weapon: WeaponId, pan: number, shotAt: number, clinks: readonly Clink[]): void {
  const last = clinks.at(-1);
  if (!last) return;
  const { material } = CASINGS[weapon];
  // Cases fly out to the right and land a pace or two away.
  const out = bus.voice(pan + 0.2, 0.25, shotAt, last.at + 1.5);
  const target = material === "steel" ? dull(engine, out, shotAt + last.at + 1.5) : out;
  for (const { at, speed } of clinks) {
    const level = clinkLevel(speed);
    if (level < AUDIBLE) continue;
    strike(engine, target, bank, weapon, material, shotAt + at, level);
  }
  // A metal case rolls a little after its last bounce: a faint rattle on the asphalt.
  if (material !== "hull") {
    noise(engine, target, shotAt + last.at + 0.01, { filter: "bandpass", frequency: material === "brass" ? 6500 : 4500, q: 5, attack: 0.03, decay: 0.25, peak: 0.012 });
  }
}

function strike(engine: AudioEngine, out: AudioNode, bank: SampleBank, weapon: WeaponId, material: CasingSpec["material"], at: number, level: number): void {
  const pitch = PITCH[weapon] * (0.96 + Math.random() * 0.08);
  const sample = bank.pick(CASE_SAMPLES[material]);
  if (!sample) {
    clank(engine, out, at, SYNTH[material], pitch, level * LEVEL * 5);
    return;
  }
  if (material === "hull") {
    playSample(engine.ctx, out, sample, at, { rate: pitch, gain: 0.8 * LEVEL * level });
    return;
  }
  // Steel shares brass takes, played lower, through the dulling filter and cut short.
  const steel = material === "steel";
  playSample(engine.ctx, out, sample, at, { rate: steel ? pitch * 0.9 : pitch, gain: (steel ? 0.6 : 0.5) * LEVEL * level, length: steel ? 0.09 : undefined });
}

/** A low pass in front of `out` for steel cases, freed when the case has settled. */
function dull(engine: AudioEngine, out: AudioNode, until: number): AudioNode {
  const filter = engine.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3800;
  filter.Q.value = 0.7;
  filter.connect(out);
  setTimeout(() => filter.disconnect(), Math.max(0, until - engine.now) * 1000);
  return filter;
}
