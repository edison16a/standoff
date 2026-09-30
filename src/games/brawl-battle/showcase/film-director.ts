import * as THREE from "three";
import { stepMatch } from "../engine/match";
import { STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import { BrawlRenderer } from "../render/brawl-renderer";
import { shotAt, type Plan, type Shot } from "./plan";
import { showcaseMatch } from "./script";

/**
 * The showcase clock ticks this many times a second. The capture tool
 * records 30 frames a second, so each recorded frame is a new moment, and
 * a half speed shot moves the fight on exactly one engine step a frame.
 */
const FPS = 60;
/** Before a shot, the renderer watches this much of the fight undrawn, so trails, sparks and poses are already in place. */
const WARM = 1.5;

const head = new THREE.Vector3();

/**
 * Plays a showcase plan: builds each shot's seeded match, runs it on to
 * where the shot begins, then steps it with the showcase clock and frames
 * it with the shot's camera. Everything is worked out from the clock
 * alone, so a moment always looks the same, the capture tool can step it
 * frame by frame and the loop joins up.
 */
export class FilmDirector {
  private readonly renderer: BrawlRenderer;
  private match: MatchState | null = null;
  private shot: Shot | null = null;
  private start: number | null = null;
  /** Match time last drawn, in seconds into the shot. */
  private drawn = -1;
  /** A moment the showcase is held on while shots are tuned, instead of the clock. */
  private pinned: number | null = null;
  /** The plan moment last drawn, so a tuning script knows its frame is up. */
  shown = -1;

  constructor(canvas: HTMLCanvasElement, private readonly plan: Plan) {
    this.renderer = new BrawlRenderer(canvas);
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
    this.drawn = -1;
  }

  /** Holds the showcase on one moment of its plan, or lets the clock run it again. */
  pin(seconds: number | null): void {
    this.pinned = seconds;
  }

  frame(now: number): void {
    this.start ??= now;
    const elapsed = this.pinned ?? Math.floor(((now - this.start) / 1000) * FPS + 1e-6) / FPS;
    const { shot, time } = shotAt(this.plan, elapsed);
    // A new shot, or the same one come round again.
    if (shot !== this.shot || time < this.drawn) this.begin(shot);
    if (time === this.drawn) return;
    const target = Math.round((shot.from + time) / STEP);
    const before = this.match!.frame;
    while (this.match!.frame < target) this.step();
    this.aim(shot, time);
    this.renderer.render((this.match!.frame - before) * STEP, 1);
    this.renderer.finish();
    this.drawn = time;
    this.shown = elapsed;
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private step(): void {
    this.renderer.beforeStep();
    stepMatch(this.match!);
    this.renderer.afterStep();
  }

  /** Builds the shot's match and runs it to the shot's first moment, the last stretch watched by the renderer. */
  private begin(shot: Shot): void {
    const match = showcaseMatch(shot.seed);
    const warmFrom = Math.round(Math.max(0, shot.from - WARM) / STEP);
    while (match.frame < warmFrom) stepMatch(match);
    this.renderer.setMatch(match);
    this.match = match;
    const first = Math.round(shot.from / STEP);
    while (match.frame < first) {
      this.step();
      this.aim(shot, 0);
      this.renderer.render(STEP, 1, false);
    }
    this.shot = shot;
    this.drawn = -1;
  }

  /** Points the camera for the shot, `time` match seconds into it. */
  private aim(shot: Shot, time: number): void {
    const rig = shot.rig;
    const cam = this.renderer.cam;
    if (rig.kind === "wide") cam.fixed = null;
    else if (rig.kind === "fixed") cam.fixed = rig;
    else if (this.renderer.headPoint(rig.id, head)) {
      cam.fixed = {
        x: head.x + (rig.dx ?? 0),
        y: head.y + (rig.dy ?? 0),
        distance: rig.distance + (rig.push ?? 0) * time,
        yaw: (rig.yaw ?? 0) + (rig.orbit ?? 0) * time,
        lift: rig.lift,
        fov: rig.fov,
      };
    }
  }
}
