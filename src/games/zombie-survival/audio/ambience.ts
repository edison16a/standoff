import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { hum, noiseBed } from "./nodes";

type Bed = ReturnType<typeof noiseBed>;
type Hum = ReturnType<typeof hum>;

/**
 * The beds under everything: a low horror drone and wind that never
 * stop, a pulse that rises in fights, the team's footsteps on the move,
 * a heartbeat when health runs low, and the helicopter's rotor.
 */
export class Ambience {
  private drones: Hum[] = [];
  private wind: Bed | null = null;
  private pulse: Hum | null = null;
  private pulseLfo: OscillatorNode | null = null;
  private rotor: { wash: Bed; chop: OscillatorNode; body: Hum } | null = null;
  private stepClock = 0;
  private stalkerClock = 12;
  private heartClock = 0;
  private eerieClock = 8;

  constructor(private readonly engine: AudioEngine) {}

  start(): void {
    if (this.drones.length) return;
    const music = this.engine.bus("music");
    const now = this.engine.now;
    // Two close notes beating slowly against each other, and a sub underneath.
    for (const [type, freq, level] of [["sawtooth", 55, 0.025], ["sawtooth", 55.35, 0.025], ["sine", 41.2, 0.12]] as const) {
      const voice = hum(this.engine, music, type, freq);
      voice.gain.gain.setTargetAtTime(level, now, 2);
      this.drones.push(voice);
    }
    const filter = this.engine.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    for (const d of this.drones) {
      d.gain.disconnect();
      d.gain.connect(filter);
    }
    filter.connect(music);
    this.wind = noiseBed(this.engine, this.engine.bus("crowd"), "bandpass", 380, 0.7);
    this.wind.gain.gain.setTargetAtTime(0.12, now, 2);
    // A slow throb for fights: the level sets how loud, a second gain makes it beat.
    const pulse = hum(this.engine, music, "sine", 46);
    const beat = this.engine.ctx.createGain();
    beat.gain.value = 0.5;
    pulse.gain.disconnect();
    pulse.gain.connect(beat).connect(music);
    const lfo = this.engine.ctx.createOscillator();
    lfo.frequency.value = 1.5;
    const depth = this.engine.ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(beat.gain);
    lfo.start();
    this.pulse = pulse;
    this.pulseLfo = lfo;
  }

  /** Called each frame with what is going on. */
  frame(dt: number, state: { fighting: boolean; walking: boolean; health: number; walkers: number }): void {
    const now = this.engine.now;
    if (this.pulse) this.pulse.gain.gain.setTargetAtTime(state.fighting ? 0.09 : 0, now, 1.2);
    if (this.wind) this.wind.filter.frequency.setTargetAtTime(320 + Math.sin(now * 0.23) * 140, now, 0.5);

    if (state.walking) {
      this.stepClock -= dt;
      if (this.stepClock <= 0) {
        this.stepClock = 0.5;
        for (let i = 0; i < Math.min(4, state.walkers); i++) this.footstep(i * 0.07);
      }
      this.stalkerClock -= dt;
      if (this.stalkerClock <= 0) {
        this.stalkerClock = 16 + Math.random() * 14;
        this.stalker();
      }
    }
    if (state.health > 0 && state.health < 35) {
      this.heartClock -= dt;
      if (this.heartClock <= 0) {
        this.heartClock = 0.5 + (state.health / 35) * 0.45;
        this.heartbeat();
      }
    }
    this.eerieClock -= dt;
    if (this.eerieClock <= 0) {
      this.eerieClock = 14 + Math.random() * 16;
      this.eerie();
    }
  }

  /** Brings the rotor in and out, 0 silent to 1 overhead. `failing` drags the blades down. */
  rotorLevel(level: number, failing: number): void {
    const now = this.engine.now;
    if (level <= 0.001) {
      if (this.rotor) {
        this.rotor.wash.stop();
        this.rotor.body.stop();
        this.rotor.chop.stop(now + 1.5);
        this.rotor = null;
      }
      return;
    }
    if (!this.rotor) {
      const bus = this.engine.bus("sfx");
      const wash = noiseBed(this.engine, bus, "lowpass", 700, 0.8);
      const body = hum(this.engine, bus, "sawtooth", 38);
      const chop = this.engine.ctx.createOscillator();
      chop.type = "square";
      chop.frequency.value = 11;
      const depth = this.engine.ctx.createGain();
      depth.gain.value = 0.5;
      chop.connect(depth).connect(wash.gain.gain);
      chop.start();
      this.rotor = { wash, chop, body };
    }
    this.rotor.wash.gain.gain.setTargetAtTime(level * 0.5, now, 0.3);
    this.rotor.body.gain.gain.setTargetAtTime(level * 0.1, now, 0.3);
    this.rotor.chop.frequency.setTargetAtTime(11 - failing * 6, now, 0.4);
    this.rotor.body.osc.frequency.setTargetAtTime(38 - failing * 14, now, 0.4);
  }

  stop(): void {
    for (const d of this.drones) d.stop();
    this.drones = [];
    this.wind?.stop();
    this.wind = null;
    this.pulse?.stop();
    this.pulseLfo?.stop();
    this.pulse = null;
    this.rotorLevel(0, 0);
  }

  private footstep(delay: number): void {
    const e = this.engine;
    const at = e.now + delay + Math.random() * 0.03;
    const out = e.bus("sfx");
    noise(e, out, at, { filter: "lowpass", frequency: 320, decay: 0.09, peak: 0.25 });
    tone(e, out, at, { type: "sine", frequency: 85, glideTo: 50, decay: 0.07, peak: 0.18 });
    noise(e, out, at, { filter: "highpass", frequency: 3200, decay: 0.03, peak: 0.04 });
    // Each step comes back off the empty buildings, fainter and duller, like a film's lonely street.
    for (const [lag, level] of [[0.19, 0.08], [0.41, 0.035]] as const) {
      noise(e, out, at + lag, { filter: "lowpass", frequency: 240, decay: 0.12, peak: level });
    }
  }

  /**
   * Now and then on the walk, a few slow steps somewhere off to one side
   * that do not match the team's. Nothing is there when the fight starts.
   */
  private stalker(): void {
    const e = this.engine;
    const side = Math.random() < 0.5 ? -0.8 : 0.8;
    const panner = e.ctx.createStereoPanner();
    panner.pan.value = side;
    panner.connect(e.bus("sfx"));
    const gap = 0.75 + Math.random() * 0.2;
    for (let i = 0; i < 4; i++) {
      const at = e.now + 0.3 + i * gap + Math.random() * 0.08;
      noise(e, panner, at, { filter: "lowpass", frequency: 260, decay: 0.14, peak: 0.07 + i * 0.012 });
      tone(e, panner, at, { type: "sine", frequency: 70, glideTo: 45, decay: 0.1, peak: 0.05 });
    }
    setTimeout(() => panner.disconnect(), 6000);
  }

  private heartbeat(): void {
    const e = this.engine;
    const out = e.bus("music");
    for (const [delay, peak] of [[0, 0.9], [0.2, 0.6]] as const) {
      tone(e, out, e.now + delay, { type: "sine", frequency: 62, glideTo: 38, decay: 0.16, peak });
      noise(e, out, e.now + delay, { filter: "lowpass", frequency: 140, decay: 0.1, peak: peak * 0.4 });
    }
  }

  /** A thin, far off glide now and then, like something crying in the dark. */
  private eerie(): void {
    const e = this.engine;
    const from = 700 + Math.random() * 700;
    tone(e, e.bus("music"), e.now, { type: "sine", frequency: from, glideTo: from * (Math.random() < 0.5 ? 0.7 : 1.3), attack: 1.2, decay: 2.8, peak: 0.018 });
  }
}
