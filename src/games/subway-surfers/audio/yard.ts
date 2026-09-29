import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Run } from "../engine/run";
import { frontAt } from "../engine/types";
import { Drone } from "./drone";
import { vary } from "./vary";
import { noise, tone } from "./voices";

/**
 * The yard around the runner: the spray can at the start, as the kid
 * tags a train before the inspector spots them, and the rumble of trains
 * rolling in.
 */

/** Shaking the can: the ball inside knocking about, four times. */
export function rattle(engine: AudioEngine, out: AudioNode, at: number): void {
  for (let i = 0; i < 4; i++) {
    const t = at + i * 0.11 + Math.random() * 0.015;
    noise(engine, out, t, { filter: "bandpass", frequency: 3000 * vary(0.1), q: 5, attack: 0.001, decay: 0.025, peak: 0.24 });
    tone(engine, out, t, { type: "triangle", frequency: 1850 * vary(0.05), decay: 0.04, peak: 0.04 });
  }
}

/** The spray: a soft hiss that swells in and runs out, band passed so it breathes rather than hisses. */
export function spray(engine: AudioEngine, out: AudioNode, at: number, length: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 3800, q: 0.9, attack: 0.06, decay: length, peak: 0.09 });
  noise(engine, out, at, { filter: "bandpass", frequency: 2200, q: 1, attack: 0.04, decay: length * 0.8, peak: 0.035 });
  // A last sputter as the finger comes off the nozzle.
  noise(engine, out, at + length * 0.7, { filter: "bandpass", frequency: 3500, q: 2, attack: 0.005, decay: 0.05, peak: 0.05 });
}

/** A train is heard this many metres before it arrives. */
const RUMBLE_FROM = 70;

/** How near the nearest train rolling in is, from 0 far off to 1 alongside. Standing trains are silent. */
export function trainNearness(run: Run): number {
  const d = run.runner.distance;
  let near = 0;
  for (const o of run.course.obstacles) {
    if (!o.drift) continue;
    const gap = frontAt(o, d) - d;
    if (gap < -o.length || gap > RUMBLE_FROM) continue;
    near = Math.max(near, gap <= 0 ? 1 : 1 - gap / RUMBLE_FROM);
  }
  return near;
}

/**
 * The low rumble of trains coming in: a band of noise down in the bass
 * that swells as the nearest train closes in, loudest as it goes by.
 */
export class Rumble {
  private readonly drone: Drone;

  constructor(engine: AudioEngine, pan: number) {
    this.drone = new Drone(engine, 85, pan, 0.7);
  }

  /** `near` is from `trainNearness`: squared, so the rumble creeps in, then swells. */
  set(near: number, at: number): void {
    this.drone.set(0.6 * near * near, at);
  }

  stop(): void {
    this.drone.stop();
  }
}
