import { trace, type TracePoint } from "./trace";
import { CUBE } from "./tuning";
import type { Level, LevelInfo, Mode, Orb, Pad, Portal, Solid, SpeedGate, Spike } from "./types";

/** Corridor heights when a portal does not say. */
export const CEILING: Record<Mode, number | null> = { cube: null, ufo: 9, ball: 6 };
/** The floor runs this far past both ends, so the camera never sees its edge. */
const RUNOFF = 60;

/**
 * Levels are written in beats. The builder turns each beat into the
 * place the player reaches on it, following every speed change, so a
 * spike put "on beat 12" is exactly where the music says. It also keeps
 * the perfect run's jumps, and can play them (see placement.ts) to put
 * obstacles around the path that run really takes.
 */
export class LevelBuilder {
  private readonly solids: Solid[] = [];
  private readonly spikeList: Spike[] = [];
  private readonly padList: Pad[] = [];
  private readonly orbList: Orb[] = [];
  private readonly portalList: Portal[] = [];
  private readonly gates: { beat: number; speed: number }[] = [];
  private readonly pits: [number, number][] = [];
  private readonly jumps: number[] = [];
  private endBeat = 0;

  constructor(
    private readonly info: LevelInfo,
    private readonly startSpeed: number,
    private readonly startMode: Mode = "cube",
  ) {}

  /** Seconds per beat. */
  get spb(): number {
    return 60 / this.info.bpm;
  }

  /** Where the player's middle is on this beat. */
  x(beat: number): number {
    let x = 0;
    let from = 0;
    let speed = this.startSpeed;
    for (const gate of this.gates) {
      if (gate.beat >= beat) break;
      x += (gate.beat - from) * this.spb * speed;
      from = gate.beat;
      speed = gate.speed;
    }
    return x + (beat - from) * this.spb * speed;
  }

  /** The highest point of a cube jump made on this beat, from flat ground. */
  apex(beat: number): number {
    return this.x(beat + CUBE.jump / CUBE.gravity / this.spb);
  }

  /** Where a cube jump made on this beat comes down, at the height it left. */
  landing(beat: number): number {
    return this.x(beat + (2 * CUBE.jump) / CUBE.gravity / this.spb);
  }

  speed(beat: number, speed: number): this {
    this.gates.push({ beat, speed });
    this.gates.sort((a, b) => a.beat - b.beat);
    return this;
  }

  portal(beat: number, mode: Mode, ceiling: number | null = CEILING[mode]): this {
    this.portalList.push({ x: this.x(beat), mode, ceiling });
    return this;
  }

  /** Jumps of the perfect run, on these beats. */
  jump(...beats: number[]): this {
    this.jumps.push(...beats);
    return this;
  }

  /** `count` spikes side by side, centred on x, standing on y (or hanging from it). */
  spikes(x: number, count = 1, y = 0, dir: 1 | -1 = 1): this {
    for (let i = 0; i < count; i++) this.spikeList.push({ x: x - count / 2 + i, y, dir });
    return this;
  }

  block(x: number, y: number, w: number, h: number): this {
    this.solids.push({ x, y, w, h, kind: "block" });
    return this;
  }

  pad(x: number, y = 0, dir: 1 | -1 = 1): this {
    this.padList.push({ x: x - 0.5, y, dir });
    return this;
  }

  orb(x: number, y: number): this {
    this.orbList.push({ x, y });
    return this;
  }

  /** A gap in the floor from x0 to x1. */
  pit(x0: number, x1: number): this {
    this.pits.push([x0, x1]);
    return this;
  }

  /** The finish line, on this beat. */
  end(beat: number): this {
    this.endBeat = beat;
    return this;
  }

  build(): Level {
    return this.assemble(this.x(this.endBeat));
  }

  /** The level with its finish at endX. */
  private assemble(endX: number): Level {
    const portals = [...this.portalList].sort((a, b) => a.x - b.x);
    const solids: Solid[] = [...this.solids];
    // The floor, with the pits cut out of it.
    let from = -RUNOFF;
    for (const [x0, x1] of [...this.pits].sort((a, b) => a[0] - b[0])) {
      solids.push({ x: from, y: -20, w: x0 - from, h: 20, kind: "ground" });
      from = x1;
    }
    solids.push({ x: from, y: -20, w: endX + RUNOFF - from, h: 20, kind: "ground" });
    portals.forEach((portal, i) => {
      if (portal.ceiling === null) return;
      const until = portals[i + 1]?.x ?? endX + RUNOFF;
      solids.push({ x: portal.x - 0.5, y: portal.ceiling, w: until - portal.x + 1, h: 20, kind: "ceiling" });
    });
    const speeds: SpeedGate[] = [];
    let speed = this.startSpeed;
    for (const gate of this.gates) {
      speeds.push({ x: this.x(gate.beat), speed: gate.speed, faster: gate.speed > speed });
      speed = gate.speed;
    }
    return {
      ...this.info,
      solids,
      spikes: [...this.spikeList],
      pads: [...this.padList],
      orbs: [...this.orbList],
      portals,
      speeds,
      startMode: this.startMode,
      startSpeed: this.startSpeed,
      endX,
      beats: this.endBeat,
      solution: [...this.jumps].sort((a, b) => a - b),
    };
  }

  /** The perfect run so far, up to x. It must not die before getting there. */
  path(untilX: number): TracePoint[] {
    const level = { ...this.assemble(untilX + RUNOFF), endX: Infinity };
    const run = trace(level, level.solution.map((beat) => beat * this.spb), { untilX });
    if (run.death) throw new Error(`${this.info.id}: the perfect run dies at x ${run.death.x.toFixed(1)}, beat ${(run.death.t / this.spb).toFixed(2)}`);
    return run.points;
  }
}
