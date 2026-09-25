import type { Seat } from "@/platform/protocol";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import { Round, type RoundEvent, type Shot } from "../engine/round";
import type { GalleryAudio } from "../audio/gallery-audio";
import type { GalleryCamera } from "../render/camera";

/** The round advances in steps no longer than this. */
const STEP_S = 1 / 30;
/**
 * A longer gap than this between frames means the tab was hidden. Only
 * this much time passes, so a round is not over the moment it returns.
 */
const MAX_GAP_S = 1;

export interface DriverHooks {
  /** Shooting has started. */
  go(): void;
  /** The buzzer went. */
  over(): void;
  /** A shot counted. */
  shot(shot: Shot): void;
}

function seed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Runs the rounds on the computer's clock: the endless practice round in
 * the lobby and the real one when it starts. It turns the round's events
 * into sound and tells the session about the moments that matter.
 */
export class RoundDriver {
  readonly practice = new Round({ seats: [], seconds: Infinity, seed: seed(), practice: true });
  live: Round | null = null;
  private lastMs: number | null = null;

  constructor(
    private readonly camera: GalleryCamera,
    private readonly audio: GalleryAudio,
    private readonly hooks: DriverHooks,
  ) {}

  /** The round on screen: the live one if there is one, the practice one otherwise. */
  get round(): Round {
    return this.live ?? this.practice;
  }

  begin(seats: readonly Seat[], seconds: number): Round {
    this.live = new Round({ seats, seconds, seed: seed() });
    return this.live;
  }

  end(): void {
    this.live = null;
  }

  tick(nowMs: number): void {
    let dt = this.lastMs === null ? 0 : Math.min(MAX_GAP_S, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    // The clock follows real time even on a slow machine, in small steps so motion stays smooth and exact.
    while (dt > 0) {
      const step = Math.min(STEP_S, dt);
      dt -= step;
      for (const event of this.round.tick(step)) this.react(event);
    }
  }

  /** A trigger pull from the aim kit. Only counts during a live round. */
  fire(seat: Seat, point: ScreenPoint): Shot | null {
    if (!this.live || this.live.phase !== "playing") return null;
    const shot = this.live.shoot(seat, this.camera.ray(point));
    if (!shot) return null;
    this.audio.shot(seat, shot.kind, shot.bull);
    this.hooks.shot(shot);
    return shot;
  }

  private react(event: RoundEvent): void {
    switch (event.type) {
      case "count":
        return this.audio.count();
      case "final":
        return this.audio.final(event.n);
      case "go":
        return this.hooks.go();
      case "over":
        return this.hooks.over();
      case "landed":
        return this.audio.landed(event.target.kind);
    }
  }
}
