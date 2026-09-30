import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";
import { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import { BattleRenderer } from "../render/battle-renderer";
import { splitPanes, type Pane } from "../render/layout";
import { TrailerFilm } from "./film";
import { FilmLights } from "./film-lights";
import { KEY_ART_AT, KEY_ART_CAMERA, KeyArt } from "./key-art";
import { Lab } from "./lab";
import { PREROLL, SEED, showcaseBattle, STILL_AT, STILL_CAMERA } from "./script";

/** A frame the software renderer took ages over counts as one filmed frame, so the film never skips. */
const STALL = 0.05;
const FILMED_FRAME = 1 / 30;
/** Drawn at most once per filmed frame: the page's own frames come twice as often. */
const DRAW_EVERY = FILMED_FRAME * 0.9;
const FULL = { x: 0, y: 0, w: 1, h: 1 };
/** The lab is seen from the front and to one side, past the end of the base wall. */
const LAB_CAMERA = { from: new THREE.Vector3(4.6, 2.2, -22.4), at: new THREE.Vector3(-0.6, 1, -28.4) };

/**
 * Runs the showcase: a seeded 2v2 of computer players, stepped at the
 * engine's fixed rate from performance.now and drawn by the real
 * renderer, so the same seed films the same fight. The loop plays the
 * trailer cut from it (trailer.ts); the poster
 * and the icon hold one moment from a pinned television camera.
 * Development aids: ?panes=4 (or 2, 1) shows the split screen with a
 * camera behind each fighter, ?lab=1 swaps the fight for the animation
 * lab, ?seed= films another fight, ?at=seconds holds a still at that
 * moment, ?cam=x,y,z,tx,ty,tz pins the television camera, and ?lite=1
 * draws cheaply for reviews on a slow machine.
 */
export class ShowcaseDirector {
  readonly renderer: BattleRenderer;
  private readonly battle: Battle;
  /** A staged scene played by hand instead of the fight: the lab or the icon's key art. */
  private readonly lab: Lab | KeyArt | null;
  /** The split screen asked for with ?panes, or null for the film's own views. */
  private readonly split: Pane[] | null;
  private readonly still: boolean;
  /** The trailer, for the loop; null for the lab, a split or a still. */
  private readonly film: TrailerFilm | null;
  private readonly lights: FilmLights | null;
  private readonly review: boolean;
  private last = -1;
  private carry = 0;
  private drawn = false;
  private wall = 0;
  private sinceReady = 0;
  private sinceDraw = Infinity;

  constructor(canvas: HTMLCanvasElement, readonly view: ShowcaseView) {
    const params = new URLSearchParams(window.location.search);
    // ?lite=1 draws without shadows or smoothing at a lower resolution, for reviews on a slow machine.
    this.renderer = new BattleRenderer(canvas, params.get("lite") ? { antialias: false, shadows: false, maxPixelRatio: 0.75 } : {});
    // The icon is staged like a game cover rather than cut from the fight; ?fight=1 shows the old frame.
    const keyArt = view === "icon" && !params.has("fight") && !params.get("lab");
    this.lab = keyArt ? new KeyArt() : params.get("lab") ? new Lab() : null;
    this.battle = this.lab?.battle ?? showcaseBattle(Number(params.get("seed")) || SEED);
    this.renderer.setBattle(this.battle, (id) => ({ name: this.battle.fighters[id]!.name, color: playerColor(id + 1) }));
    const count = Number(params.get("panes")) || 0;
    this.split = count > 0 ? splitPanes(this.battle.fighters.slice(0, count).map((f) => ({ id: f.id, team: f.team }))) : null;
    const cam = params.get("cam")?.split(",").map(Number);
    const pinned = cam?.length === 6 ? { from: new THREE.Vector3(cam[0], cam[1], cam[2]), at: new THREE.Vector3(cam[3], cam[4], cam[5]) } : null;
    this.renderer.show.fixed = pinned ?? (keyArt ? KEY_ART_CAMERA : this.lab ? LAB_CAMERA : (STILL_CAMERA[view] ?? null));
    // Sized now, so the cameras run up to a still with the view's real shape.
    this.renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    const at = Number(params.get("at")) || (keyArt ? KEY_ART_AT : this.lab ? 0 : STILL_AT[view]);
    this.still = at > 0;
    // The media have no words, so the name tags go, and they are lit like a film.
    const filmed = (keyArt || !this.lab) && !this.split;
    this.renderer.tags = !filmed;
    this.lights = filmed ? new FilmLights(this.renderer.scene) : null;
    this.film = this.lights && !this.still ? new TrailerFilm(this.battle, this.renderer, this.lights) : null;
    // ?review=1 leaves the trailer still for a script, which moves it on with window.__cbTrailer(seconds).
    this.review = this.film !== null && params.has("review");
    if (this.review) Object.assign(window, { __cbTrailer: (t: number) => (this.film?.frame(t, FILMED_FRAME), this.renderer.finish()) });
    const fixed = this.renderer.show.fixed;
    if (fixed) this.lights?.aim(fixed.from, fixed.at);
    if (this.still) {
      for (let t = 0; t < at; t += FILMED_FRAME) this.draw(FILMED_FRAME, false);
      this.exposeFilm();
    }
  }

  /**
   * window.__cbFilm(seconds) moves a still on by that much and draws it,
   * so a script can take a frame sequence at any rate to check motion.
   */
  private exposeFilm(): void {
    Object.assign(window, {
      __cbFilm: (seconds: number) => {
        for (let t = 0; t + 1e-9 < seconds; t += FILMED_FRAME) this.draw(Math.min(FILMED_FRAME, seconds - t), t + FILMED_FRAME >= seconds - 1e-9);
        this.renderer.finish();
      },
      __cbBattle: this.battle,
    });
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
    this.drawn = false;
  }

  frame(now: number): void {
    if (this.still) {
      if (this.drawn) return;
      this.draw(0, true);
      this.renderer.finish();
      this.drawn = true;
      return;
    }
    const gap = this.last < 0 ? STEP : (now - this.last) / 1000;
    this.last = now;
    const real = gap > STALL ? FILMED_FRAME : gap;
    if (window.__showcaseReady) this.sinceReady += real;
    this.sinceDraw += real;
    if (this.review) return;
    if (this.film) {
      // The capture's warm up is never filmed, so the film starts, and is drawn, only after it.
      if (this.sinceReady < PREROLL || this.sinceDraw < DRAW_EVERY) return;
      this.film.frame(this.sinceReady - PREROLL, this.sinceDraw);
      this.sinceDraw = 0;
      this.renderer.finish();
      return;
    }
    // The capture's warm up is never filmed, so only the frames after it are drawn.
    const show = (this.lab !== null || this.sinceReady >= PREROLL) && this.sinceDraw >= DRAW_EVERY;
    this.draw(real, show);
    if (!show) return;
    this.sinceDraw = 0;
    this.renderer.finish();
  }

  /** The views to draw now: a split asked for, the lab's television shot, or the film's hero. */
  private panes(): Pane[] {
    if (this.split) return this.split;
    return [{ fighter: null, rect: FULL }];
  }

  /** Steps the battle by a slice of time and draws it (or only animates, for frames nobody sees). */
  private draw(dt: number, show: boolean): void {
    this.carry += dt;
    const events: BattleEvent[] = [];
    while (this.carry >= STEP) {
      this.carry -= STEP;
      events.push(...(this.lab ? this.lab.step() : this.battle.step()));
    }
    this.renderer.onEvents(events);
    this.wall += dt;
    if (show) this.renderer.render(this.panes(), dt, this.wall);
    else this.renderer.animate(dt, this.wall, this.panes());
  }

  dispose(): void {
    this.lights?.dispose();
    this.renderer.dispose();
  }
}
