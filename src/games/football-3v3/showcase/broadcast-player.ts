import type { MatchRenderer } from "../render/match-renderer";
import { gameReel, type Reel } from "./reel";

/** One filmed frame for a frame by frame review: a thirtieth of a second. */
const FRAME = 1 / 30;

/**
 * The showcase's seeded game through the broadcast camera, for looking at
 * the players as the game shows them (development only, ?game=<seconds>).
 * `speed` 0 holds the moment with the bodies settled into it and 1 plays
 * on at the game's own pace. With `speed` set to "step" the game moves
 * only when a review script calls `window.__fbStep(frames)`, a thirtieth
 * of a second a frame, so a slow software renderer still sees every one.
 */
export class BroadcastPlayer {
  private readonly reel: Reel = gameReel();
  private first = -1;
  private t: number;
  private anim = 0;

  constructor(private readonly renderer: MatchRenderer, from: number, private readonly speed: number | "step") {
    this.t = from;
    if (speed === "step") Object.assign(window, { __fbStep: (n: number) => this.step(n) });
  }

  frame(nowMs: number): void {
    if (this.first < 0) {
      this.first = nowMs;
      this.anim = nowMs;
      // Let the camera and the bodies arrive before the first picture.
      const view = this.reel.at(this.t);
      for (let i = 0; i < 60; i++) this.renderer.update(view, nowMs - (60 - i) * 33);
    }
    if (this.speed === "step") return;
    const t = this.t + ((nowMs - this.first) / 1000) * this.speed;
    this.renderer.draw(this.reel.at(t), nowMs);
  }

  private step(frames: number): number {
    for (let i = 0; i < frames; i++) {
      this.t += FRAME;
      this.anim += FRAME * 1000;
      if (i < frames - 1) this.renderer.update(this.reel.at(this.t), this.anim);
    }
    this.renderer.draw(this.reel.at(this.t), this.anim);
    return this.t;
  }
}
