import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { WeaponId } from "../../engine/weapons";
import type { GunBus } from "./gun-bus";
import { DRY_SAMPLES, STEP_SAMPLES, type SampleName } from "./manifest";
import { clank, type Clank } from "./modal";
import type { GunCue } from "./reload-plan";
import { playSample, type SampleBank } from "./sample-bank";

/**
 * The gun's moving parts: every reload step, the pump, the dry click and
 * the AR's bolt locking open. A step with a recording plays it; the rest,
 * and every step until the recordings load, use these synthesised clanks.
 */
const SYNTH: Record<GunCue, Clank> = {
  // Hands and sling shifting as the gun comes up: cloth, a faint knock.
  lift: { noise: [{ filter: "bandpass", frequency: 900, q: 0.7, attack: 0.04, decay: 0.18, peak: 0.05 }], ring: { modes: [1200, 2300], decay: 0.02, peak: 0.012 } },
  settle: { noise: [{ filter: "bandpass", frequency: 700, q: 0.8, attack: 0.02, decay: 0.12, peak: 0.04 }] },
  // A small steel button: a bright tick.
  "mag-release": { noise: [{ filter: "bandpass", frequency: 4200, q: 4, decay: 0.012, peak: 0.22 }], ring: { modes: [3100, 5300, 7900], decay: 0.025, peak: 0.07 } },
  // Sheet metal sliding out of the well.
  "mag-out": { noise: [{ filter: "bandpass", frequency: 1800, q: 1.2, sweepTo: 900, attack: 0.01, decay: 0.14, peak: 0.28 }], ring: { modes: [1400, 2600], decay: 0.04, peak: 0.05 } },
  // The empty magazine landing on asphalt a metre and more below.
  "mag-drop": {
    noise: [{ filter: "bandpass", frequency: 1200, decay: 0.06, peak: 0.3 }],
    ring: { modes: [900, 1650, 2700], decay: 0.08, peak: 0.07 },
    thump: { frequency: 180, glideTo: 90, decay: 0.05, peak: 0.25 },
  },
  "mag-in": { noise: [{ filter: "bandpass", frequency: 1500, q: 1.3, sweepTo: 2600, attack: 0.015, decay: 0.09, peak: 0.28 }], ring: { modes: [1700, 2900], decay: 0.03, peak: 0.05 } },
  // The magazine catch snapping over: metal on metal under a palm slap.
  "mag-seat": {
    noise: [{ filter: "bandpass", frequency: 2200, q: 2, decay: 0.04, peak: 0.45 }],
    ring: { modes: [1300, 2450, 3900, 5600], decay: 0.06, peak: 0.14 },
    thump: { frequency: 220, glideTo: 120, decay: 0.04, peak: 0.22 },
  },
  // The handle dragging the bolt back against its spring.
  "bolt-back": { noise: [{ filter: "bandpass", frequency: 2600, q: 1.5, sweepTo: 1600, attack: 0.008, decay: 0.08, peak: 0.32 }], ring: { modes: [2900, 4700], decay: 0.03, peak: 0.07 } },
  // Let go, the bolt slams home: the loudest part of a reload.
  "bolt-forward": {
    noise: [{ filter: "bandpass", frequency: 2000, q: 1.8, decay: 0.05, peak: 0.5 }],
    ring: { modes: [1600, 2750, 4300, 6100], decay: 0.09, peak: 0.18 },
    thump: { frequency: 160, glideTo: 90, decay: 0.05, peak: 0.22 },
  },
  // The catch paddle itself. The bolt running home follows it.
  "bolt-catch": { noise: [{ filter: "bandpass", frequency: 5000, q: 5, decay: 0.01, peak: 0.22 }], ring: { modes: [3600, 6200], decay: 0.015, peak: 0.05 } },
  "pump-back": { noise: [{ filter: "bandpass", frequency: 1400, q: 2, sweepTo: 900, decay: 0.07, peak: 0.38 }], ring: { modes: [1100, 1900, 3100], decay: 0.05, peak: 0.11 } },
  "pump-forward": {
    noise: [{ filter: "bandpass", frequency: 1900, q: 2.5, decay: 0.05, peak: 0.45 }],
    ring: { modes: [1500, 2600, 3900], decay: 0.07, peak: 0.16 },
    thump: { frequency: 180, glideTo: 100, decay: 0.04, peak: 0.18 },
  },
  // A plastic hull pushed past the shell latch.
  "shell-in": { noise: [{ filter: "bandpass", frequency: 2600, q: 3, decay: 0.035, peak: 0.32 }], ring: { modes: [1250, 2900], decay: 0.03, peak: 0.07 } },
  // The hammer falling on nothing.
  dry: { noise: [{ filter: "bandpass", frequency: 3400, q: 3, decay: 0.03, peak: 0.28 }], ring: { modes: [2600, 4100, 6900], decay: 0.015, peak: 0.18 } },
  // The AR's bolt slamming onto the catch behind the empty magazine: a hard, ringing steel clack.
  "bolt-lock": {
    noise: [{ filter: "bandpass", frequency: 3000, q: 1.5, decay: 0.02, peak: 0.45 }],
    ring: { modes: [2350, 3720, 5480, 7900], decay: 0.12, peak: 0.2 },
    thump: { frequency: 260, glideTo: 150, decay: 0.03, peak: 0.18 },
  },
};

/** Bigger guns have bigger parts that ring lower. */
const PITCH: Record<WeaponId, number> = { shotgun: 0.85, smg: 1.12, rifle: 1, ak47: 0.92 };

/** Recording levels per cue, against the shot. A magazine hitting the street is quieter than a bolt slamming. */
const SAMPLE_GAIN: Partial<Record<GunCue, number>> = { "mag-drop": 0.55, "mag-out": 0.6, "mag-in": 0.6, "shell-in": 0.6, dry: 0.7 };

/** The magazine falls to the street, so more of it reaches the echo. */
const WET: Partial<Record<GunCue, number>> = { "mag-drop": 0.3, "bolt-lock": 0.2, dry: 0.15 };

/** The recorded takes for a cue, if any. The bolt locking open has none: no clean CC0 take of it was found. */
function samplesFor(weapon: WeaponId, cue: GunCue): readonly SampleName[] | undefined {
  if (cue === "dry") return DRY_SAMPLES;
  if (cue === "bolt-lock") return undefined;
  return STEP_SAMPLES[weapon][cue];
}

/** Plays one moving part of `weapon` at `at`. */
export function playCue(engine: AudioEngine, bus: GunBus, bank: SampleBank, weapon: WeaponId, cue: GunCue, pan: number, at: number): void {
  const out = bus.voice(pan, WET[cue] ?? 0.1, at, 1.5);
  const sample = bank.pick(samplesFor(weapon, cue));
  const vary = 0.97 + Math.random() * 0.06;
  if (cue === "bolt-catch") {
    // The click of the paddle, then the bolt runs home a moment later.
    clank(engine, out, at, SYNTH[cue], PITCH[weapon] * vary);
    if (sample) playSample(engine.ctx, out, sample, at + 0.02, { rate: vary, gain: 0.8 });
    else clank(engine, out, at + 0.02, SYNTH["bolt-forward"], PITCH[weapon] * vary);
    return;
  }
  if (sample) playSample(engine.ctx, out, sample, at, { rate: vary, gain: (SAMPLE_GAIN[cue] ?? 0.8) * (0.9 + Math.random() * 0.2) });
  else clank(engine, out, at, SYNTH[cue], PITCH[weapon] * vary);
}
