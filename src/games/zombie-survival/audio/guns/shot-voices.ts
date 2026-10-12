import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, type NoiseOptions } from "@/platform/audio/voices";
import type { WeaponId } from "../../engine/weapons";
import type { GunBus } from "./gun-bus";
import { SHOT_SAMPLES } from "./manifest";
import { clank, type Clank, type Thump } from "./modal";
import { playSample, type SampleBank } from "./sample-bank";

/**
 * How each gun's report is built. A real shot is four things at once: the
 * supersonic crack of the bullet (a click with almost no rise time), the
 * muzzle blast (a burst of hot gas, the bulk of the bang), a low thump you
 * feel more than hear, and the action cycling. The recording carries the
 * blast and its natural tail; the synthesis sharpens the crack and adds
 * the thump, and stands in alone until the recordings have loaded.
 */
interface ShotVoice {
  /** Level of the recording. */
  sample: number;
  /** Share of the shot sent to the street echo. */
  wet: number;
  crack: NoiseOptions;
  blast: NoiseOptions;
  thump: Thump;
  /** The rumble that trails a synthesised shot. A recording brings its own. */
  tail: NoiseOptions;
  /** The bolt slamming back and forward, heard faintly under the bang. */
  action?: Clank;
}

const VOICES: Record<WeaponId, ShotVoice> = {
  // Buckshot is subsonic: no crack, all blast, with the deepest thump.
  shotgun: {
    sample: 1,
    wet: 0.5,
    crack: { filter: "highpass", frequency: 1500, decay: 0.03, peak: 0.6 },
    blast: { filter: "lowpass", frequency: 1300, decay: 0.38, peak: 1 },
    thump: { frequency: 72, glideTo: 30, decay: 0.45, peak: 1 },
    tail: { filter: "lowpass", frequency: 700, attack: 0.02, decay: 1.2, peak: 0.3 },
  },
  // A 9 mm blowback: a short snap, light thump, its bolt chattering.
  smg: {
    sample: 0.75,
    wet: 0.38,
    crack: { filter: "highpass", frequency: 3500, decay: 0.012, peak: 0.45 },
    blast: { filter: "bandpass", frequency: 1100, q: 0.9, decay: 0.08, peak: 0.45 },
    thump: { frequency: 150, glideTo: 60, decay: 0.06, peak: 0.35 },
    tail: { filter: "lowpass", frequency: 1100, attack: 0.01, decay: 0.45, peak: 0.12 },
    action: { ring: { modes: [2100, 3400, 5200], decay: 0.03, peak: 0.05 } },
  },
  // 5.56 leaves at three times the speed of sound: the sharpest crack of the four.
  rifle: {
    sample: 0.85,
    wet: 0.48,
    crack: { filter: "highpass", frequency: 4500, decay: 0.008, peak: 0.7 },
    blast: { filter: "lowpass", frequency: 1800, decay: 0.15, peak: 0.6 },
    thump: { frequency: 120, glideTo: 45, decay: 0.14, peak: 0.5 },
    tail: { filter: "lowpass", frequency: 900, attack: 0.015, decay: 0.8, peak: 0.2 },
    action: { ring: { modes: [1800, 2900, 4600], decay: 0.035, peak: 0.06 } },
  },
  // The heavy 7.62 round: a crack, then a lower, rougher bark than the rifle.
  ak47: {
    sample: 0.95,
    wet: 0.48,
    crack: { filter: "highpass", frequency: 3000, decay: 0.012, peak: 0.75 },
    blast: { filter: "lowpass", frequency: 1000, decay: 0.22, peak: 0.85 },
    thump: { frequency: 90, glideTo: 36, decay: 0.2, peak: 0.75 },
    tail: { filter: "lowpass", frequency: 800, attack: 0.015, decay: 0.95, peak: 0.25 },
    action: { ring: { modes: [1500, 2600, 3900], decay: 0.04, peak: 0.08 } },
  },
};

/** The synthesis on top of a recording is quieter, there to add punch and keep repeats from sounding identical. */
const OVER_SAMPLE = { crack: 0.45, thump: 0.6 };

/** Plays one shot of `weapon` at audio time `at`, panned toward its gun. */
export function playShot(engine: AudioEngine, bus: GunBus, bank: SampleBank, weapon: WeaponId, pan: number, at: number): void {
  const voice = VOICES[weapon];
  const out = bus.voice(pan, voice.wet, at, 3);
  // Each round is a little different: powder load, the mic is a different ear.
  const vary = 0.96 + Math.random() * 0.08;
  const sample = bank.pick(SHOT_SAMPLES[weapon]);
  const crack = sample ? OVER_SAMPLE.crack : 1;
  const thump = sample ? OVER_SAMPLE.thump : 1;
  noise(engine, out, at, { ...voice.crack, frequency: voice.crack.frequency * vary, attack: 0.0003, peak: voice.crack.peak * crack });
  clank(engine, out, at, { thump: voice.thump }, vary, thump);
  if (sample) {
    playSample(engine.ctx, out, sample, at, { rate: vary, gain: voice.sample * (0.92 + Math.random() * 0.16) });
  } else {
    noise(engine, out, at, { ...voice.blast, frequency: voice.blast.frequency * vary, attack: 0.0008 });
    noise(engine, out, at + 0.01, voice.tail);
  }
  if (voice.action) clank(engine, out, at + 0.006, voice.action, vary);
}
