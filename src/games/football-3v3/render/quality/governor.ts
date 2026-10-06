import type * as THREE from "three";
import { GpuClock } from "./gpu-clock";
import { climb, judge, LADDER, stepDown, type Climb, type Tier } from "./ladder";
import { PaceWatch } from "./pace";

/** The rung the last picture on this page settled on, so a second game starts where the first left off. */
let remembered = 0;

/**
 * Keeps each frame inside 60 a second on whatever card draws it. Where
 * the browser can time the card (desktop Chrome) every frame is measured
 * and the picture walks down the ladder when frames run long and back up
 * when there is room. Elsewhere it watches for frames missing their slot
 * and only steps down. A fixed picture (the showcase film, software test
 * drawing) never moves.
 */
export class Governor {
  private readonly clock: GpuClock;
  private readonly pace = new PaceWatch();
  private readonly climb: Climb;
  private size = { width: 1, height: 1, ratio: 1 };
  private readonly listeners: ((tier: Tier) => void)[] = [];

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly fixed: boolean) {
    this.clock = new GpuClock(renderer.getContext());
    this.climb = climb(fixed ? 0 : remembered);
  }

  get tier(): Tier {
    return LADDER[this.climb.rung]!.tier;
  }

  /** Smoothed card time per frame, or null where the card cannot be timed. */
  get gpuMs(): number | null {
    return this.climb.ms;
  }

  get rung(): number {
    return this.climb.rung;
  }

  /** Hears every change of tier, and the tier now. */
  onTier(listener: (tier: Tier) => void): void {
    this.listeners.push(listener);
    listener(this.tier);
  }

  /** `ratio` is the most pixels per page pixel the picture should ever draw. */
  resize(width: number, height: number, ratio: number): void {
    this.size = { width: Math.max(1, width), height: Math.max(1, height), ratio };
    this.fit();
  }

  /** Draws through `render`, timing the card's work, and moves on the ladder once the timings say so. */
  draw(render: () => void): void {
    this.clock.begin();
    render();
    this.clock.end();
    if (this.fixed) return;
    const before = this.climb.rung;
    if (this.clock.ready) {
      for (const ms of this.clock.collect()) judge(this.climb, ms);
    } else if (this.pace.tick(performance.now())) {
      stepDown(this.climb);
    }
    if (this.climb.rung === before) return;
    remembered = this.climb.rung;
    const tier = this.tier;
    if (LADDER[before]!.tier !== tier) for (const l of this.listeners) l(tier);
    this.fit();
  }

  private fit(): void {
    this.renderer.setPixelRatio(this.size.ratio * LADDER[this.climb.rung]!.scale);
    this.renderer.setSize(this.size.width, this.size.height, false);
  }

  dispose(): void {
    this.clock.dispose();
  }
}
