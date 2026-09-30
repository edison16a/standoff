import * as THREE from "three";
import type { MatchView } from "../engine";
import type { MatchRenderer } from "../render/match-renderer";
import { filmCam, type FilmCam } from "./film-cams";
import { FilmLights } from "./film-lights";
import type { Still } from "./stills";
import { gameReel, trophyReel, type Reel } from "./reel";
import { filmAt, type FilmSpot } from "./trailer";

/** The capture tool warms the page up this long after it is ready, then films. */
const WARMUP = 3;
/** Drawn at most once per filmed frame: the page's own frames come twice as often. */
const DRAW_EVERY = 0.025;

/**
 * Plays the trailer through the real renderer. The film is a pure
 * function of its clock, so a capture that steps time frame by frame
 * gets the same film every time. The players' animations run on the
 * film's own slowed clock, so slow motion slows their strides too.
 */
export class TrailerPlayer {
  private readonly reels: Record<"game" | "trophy", Reel>;
  private readonly lights: FilmLights;
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readyAt = -1;
  private lastNow = -1;
  private lastDraw = -Infinity;
  private anim = 0;
  private shown = -1;

  constructor(private readonly renderer: MatchRenderer, scene: THREE.Scene) {
    this.reels = { game: gameReel(), trophy: trophyReel() };
    this.lights = new FilmLights(scene);
    // A roaring crowd throughout: every shot is a big moment.
    renderer.onEvent({ type: "touchdown", team: 0, id: 1, pass: 0, conversion: false });
  }

  /** The film's frame at `t` seconds, and its camera. */
  spot(t: number): { spot: FilmSpot; view: MatchView; cam: FilmCam } {
    const spot = filmAt(t);
    const view = this.reels[spot.shot.reel].at(spot.time);
    return { spot, view, cam: filmCam(spot.shot.camera, view, spot.u) };
  }

  /** Draws the film at `t`, easing the players into their poses first when it is a new shot. */
  draw(t: number, dt: number): void {
    const { spot, view, cam } = this.spot(t);
    this.anim += dt * spot.shot.rate;
    if (spot.index !== this.shown) {
      // A cut jumps to another moment, so the bodies settle into it rather than blending from the last shot.
      this.renderer.settle(view, this.anim * 1000, 0.6);
      this.shown = spot.index;
    }
    this.pos.set(cam.pos.x, cam.pos.y, cam.pos.z);
    this.look.set(cam.look.x, cam.look.y, cam.look.z);
    this.renderer.director.setFixed(this.pos, this.look, cam.fov);
    this.lights.aim(this.pos, this.look);
    this.renderer.draw(view, this.anim * 1000);
  }

  /** Holds one moment of the film for a still, its bodies settled into their poses. */
  hold(still: Still | number): void {
    const t = typeof still === "number" ? still : still.t;
    const { spot, view, cam: filmed } = this.spot(t);
    const cam = typeof still === "number" ? filmed : (still.camera?.(view) ?? filmed);
    this.anim = spot.time;
    this.renderer.settle(view, this.anim * 1000, 1.5);
    this.pos.set(cam.pos.x, cam.pos.y, cam.pos.z);
    this.look.set(cam.look.x, cam.look.y, cam.look.z);
    this.renderer.director.setFixed(this.pos, this.look, cam.fov);
    this.lights.aim(this.pos, this.look);
    this.renderer.draw(view, this.anim * 1000);
  }

  /** The page's frame: films from the moment the capture's warm up ends, so the clip opens on the first shot. */
  frame(nowMs: number): void {
    const now = nowMs / 1000;
    if (this.readyAt < 0 && window.__showcaseReady) this.readyAt = now;
    const dt = this.lastNow < 0 ? 0 : Math.min(0.1, now - this.lastNow);
    this.lastNow = now;
    if (now - this.lastDraw < DRAW_EVERY) return;
    const t = this.readyAt < 0 ? 0 : now - this.readyAt - WARMUP;
    this.draw(t, this.lastDraw < 0 ? dt : Math.min(0.1, now - this.lastDraw));
    this.lastDraw = now;
  }

  dispose(): void {
    this.lights.dispose();
  }
}
