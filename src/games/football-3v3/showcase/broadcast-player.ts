import * as THREE from "three";
import type { MatchView } from "../engine";
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
 * `follow` tracks one player from the sideline, close, to study a stride.
 */
export class BroadcastPlayer {
  private readonly reel: Reel = gameReel();
  private first = -1;
  private t: number;
  private anim = 0;

  constructor(private readonly renderer: MatchRenderer, from: number, private readonly speed: number | "step", private readonly follow: number | null = null) {
    this.t = from;
    if (speed === "step") Object.assign(window, { __fbStep: (n: number) => this.step(n) });
  }

  /** The still at `t`, with the sideline camera moved onto the followed player. */
  private at(t: number): MatchView {
    const view = this.reel.at(t);
    const a = this.follow === null ? null : view.athletes.find((p) => p.id === this.follow);
    if (a) this.renderer.director.setFixed(new THREE.Vector3(a.x + 0.8, 1.15, a.z - 5.2), new THREE.Vector3(a.x, 0.95, a.z), 36);
    return view;
  }

  frame(nowMs: number): void {
    if (this.first < 0) {
      this.first = nowMs;
      this.anim = nowMs;
      // Let the camera and the bodies arrive before the first picture.
      const view = this.at(this.t);
      for (let i = 0; i < 60; i++) this.renderer.update(view, nowMs - (60 - i) * 33);
    }
    if (this.speed === "step") return;
    const t = this.t + ((nowMs - this.first) / 1000) * this.speed;
    this.renderer.draw(this.at(t), nowMs);
  }

  private step(frames: number): number {
    for (let i = 0; i < frames; i++) {
      this.t += FRAME;
      this.anim += FRAME * 1000;
      if (i < frames - 1) this.renderer.update(this.at(this.t), this.anim);
    }
    this.renderer.draw(this.at(this.t), this.anim);
    return this.t;
  }
}
