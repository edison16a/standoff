import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise, tone } from "../../../platform/audio/voices";

/** The drone's pitch at rest; a swing bends it up like a passing engine. */
const BASE_HZ = 86;

/**
 * The energy blade's hum: two slightly detuned saws and their octave
 * through a lowpass, always on while the blade is out. A swing brightens
 * it, lifts its pitch and swells it, so the blade sings as it moves. It
 * lights with a crackling rise and dies away when the blade leaves.
 */
export class EnergyHum {
  private voice: { oscs: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly out: AudioNode,
  ) {}

  /** `on` while the blade is out; `speed` is how fast its tip is moving, in m/s. */
  update(on: boolean, speed: number): void {
    if (!on) return this.stop();
    if (!this.voice) this.start();
    const voice = this.voice!;
    const s = Math.min(1, Math.max(0, speed / 9));
    const at = this.engine.now;
    voice.oscs.forEach((osc, i) => osc.frequency.setTargetAtTime([BASE_HZ, BASE_HZ * 1.03, BASE_HZ * 2][i]! * (1 + 0.16 * s), at, 0.03));
    voice.filter.frequency.setTargetAtTime(380 + 2200 * s, at, 0.03);
    voice.gain.gain.setTargetAtTime(0.05 + 0.18 * s, at, 0.04);
  }

  stop(): void {
    const voice = this.voice;
    if (!voice) return;
    this.voice = null;
    const at = this.engine.now;
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setTargetAtTime(0.0001, at, 0.12);
    for (const osc of voice.oscs) osc.stop(at + 0.8);
    voice.oscs[0]!.onended = () => voice.gain.disconnect();
  }

  private start(): void {
    const { ctx } = this.engine;
    const at = this.engine.now;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(0.05, at + 0.15, 0.1);
    filter.connect(gain).connect(this.out);
    const oscs = (["sawtooth", "sawtooth", "sine"] as const).map((type, i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = [BASE_HZ, BASE_HZ * 1.03, BASE_HZ * 2][i]!;
      osc.connect(filter);
      osc.start(at);
      return osc;
    });
    this.voice = { oscs, filter, gain };
    // Lighting up: a crackle and a rising snap.
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: 1200, sweepTo: 4200, q: 1, attack: 0.02, decay: 0.3, peak: 0.12 });
    tone(this.engine, this.out, at, { type: "sawtooth", frequency: 60, glideTo: BASE_HZ * 2, attack: 0.05, decay: 0.3, peak: 0.08 });
  }
}
