import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { RunEvent } from "../engine/events";
import type { Run } from "../engine/run";
import { speedAt, SPEED } from "../engine/tuning";
import { Music, type TuneName } from "./music";
import { Sfx } from "./sfx";

/** A looping hiss through a filter, for the jetpack's roar and the board's hum. */
class Drone {
  private readonly gain: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly source: AudioBufferSourceNode;

  constructor(engine: AudioEngine, frequency: number, pan: number) {
    const ctx = engine.ctx;
    this.source = ctx.createBufferSource();
    this.source.buffer = engine.noiseBuffer();
    this.source.loop = true;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "bandpass";
    this.filter.frequency.value = frequency;
    this.filter.Q.value = 0.8;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    this.source.connect(this.filter).connect(this.gain).connect(panner).connect(engine.bus("sfx"));
    this.source.start();
  }

  set(level: number, at: number): void {
    this.gain.gain.setTargetAtTime(level, at, 0.12);
  }

  stop(): void {
    this.source.stop();
    this.gain.disconnect();
  }
}

interface Voice {
  pan: number;
  stride: number;
  left: boolean;
  jet: Drone;
  board: Drone;
}

/**
 * What the game sounds like: the music for the moment, and a sound for
 * every run event on the side of the room its player stands.
 */
export class SoundDirector {
  readonly sfx: Sfx;
  private readonly music: Music;
  private voices: Voice[] = [];

  constructor(private readonly engine: AudioEngine) {
    this.sfx = new Sfx(engine);
    this.music = new Music(engine);
    engine.setLevels({ music: 0.45, crowd: 0, sfx: 0.9 });
  }

  /** Sets up one voice per runner, player one on the left. */
  setPlayers(count: number): void {
    this.stopVoices();
    this.voices = Array.from({ length: count }, (_, i) => {
      const pan = count === 1 ? 0 : i === 0 ? -0.55 : 0.55;
      return { pan, stride: 0, left: false, jet: new Drone(this.engine, 700, pan), board: new Drone(this.engine, 2400, pan) };
    });
  }

  play(tune: TuneName | null): void {
    this.music.play(tune);
    this.music.muffle(false);
  }

  muffle(on: boolean): void {
    this.music.muffle(on);
  }

  fanfare(): void {
    this.music.fanfare();
  }

  panFor(slot: number): number {
    return this.voices[slot - 1]?.pan ?? 0;
  }

  event(slot: number, event: RunEvent): void {
    const pan = this.panFor(slot);
    const s = this.sfx;
    switch (event.type) {
      case "coin":
        return s.coin(event.streak, pan);
      case "jump":
        return s.jump(pan, event.boots);
      case "land":
        return s.land(pan, event.speed, event.roof);
      case "roll":
        return s.roll(pan);
      case "lane":
        return s.lane(pan, event.to - event.from);
      case "stumble":
        s.stumble(pan);
        return s.whistle(pan);
      case "crash":
        return s.crash(pan);
      case "saved":
        return s.saved(pan);
      case "power":
        return s.power(pan, event.kind);
      case "powerEnd":
        return s.powerEnd(pan);
      case "level":
        return s.level(pan);
      case "horn":
        return s.horn(pan);
      case "passBy":
        return s.passBy(pan + event.side * 0.3);
    }
  }

  /** Footsteps and the loops that follow each runner, every frame. `paused` silences a runner. */
  frame(runs: readonly (Run | null)[], paused: readonly boolean[]): void {
    const now = this.engine.now;
    let fastest = 0;
    runs.forEach((run, i) => {
      const voice = this.voices[i];
      if (!voice || !run) return;
      const live = !run.crashed && !paused[i] && !run.options.practice;
      const onFoot = live && run.runner.grounded && run.runner.rollLeft <= 0 && !run.powers.has("hoverboard");
      const stride = (run.runner.distance / 1.45) % 1;
      if (onFoot && stride < voice.stride) {
        voice.left = !voice.left;
        this.sfx.footstep(voice.pan, voice.left);
      }
      voice.stride = stride;
      voice.jet.set(live && run.powers.has("jetpack") ? 0.3 : 0, now);
      voice.board.set(live && run.powers.has("hoverboard") ? 0.05 : 0, now);
      if (live) fastest = Math.max(fastest, run.runner.distance);
    });
    // The beat quickens by up to a tenth as the runners reach top speed.
    this.music.setTempo(1 + 0.1 * ((speedAt(fastest) - SPEED.start) / (SPEED.max - SPEED.start)));
  }

  stop(): void {
    this.stopVoices();
    this.music.stop();
    this.sfx.dispose();
  }

  private stopVoices(): void {
    for (const voice of this.voices) {
      voice.jet.stop();
      voice.board.stop();
    }
    this.voices = [];
  }
}
