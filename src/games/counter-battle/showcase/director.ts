import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";
import { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import { BattleRenderer } from "../render/battle-renderer";
import { splitPanes, type Pane } from "../render/layout";
import { Lab } from "./lab";
import { showcaseBattle, SEED } from "./script";

/** A frame the software renderer took ages over counts as one filmed frame, so the film never skips. */
const STALL = 0.05;
const FILMED_FRAME = 1 / 30;

/**
 * Runs the showcase: a seeded 2v2 of computer players, stepped at the
 * engine's fixed rate from performance.now and drawn by the real
 * renderer, so the same seed films the same fight. Development aids:
 * ?panes=4 (or 2, 1) shows the split screen with a camera behind each
 * fighter, ?lab=1 swaps the fight for the animation lab, ?seed= films
 * another fight, ?at=seconds holds a still at that moment, and
 * ?cam=x,y,z,tx,ty,tz pins the television camera, and ?lite=1 draws
 * cheaply for reviews on a slow machine.
 */
export class ShowcaseDirector {
  readonly renderer: BattleRenderer;
  private readonly battle: Battle;
  private readonly lab: Lab | null;
  private readonly panes: Pane[];
  private readonly still: boolean;
  private last = -1;
  private carry = 0;
  private drawn = false;
  private wall = 0;

  constructor(canvas: HTMLCanvasElement, readonly view: ShowcaseView) {
    const params = new URLSearchParams(window.location.search);
    // ?lite=1 draws without shadows or smoothing at a lower resolution, for reviews on a slow machine.
    this.renderer = new BattleRenderer(canvas, params.get("lite") ? { antialias: false, shadows: false, maxPixelRatio: 0.75 } : {});
    this.lab = params.get("lab") ? new Lab() : null;
    this.battle = this.lab?.battle ?? showcaseBattle(Number(params.get("seed")) || SEED);
    this.renderer.setBattle(this.battle, (id) => ({ name: this.battle.fighters[id]!.name, color: playerColor(id + 1) }));
    const count = Number(params.get("panes")) || 0;
    const seated = this.battle.fighters.slice(0, count).map((f) => ({ id: f.id, team: f.team }));
    this.panes = splitPanes(seated);
    const cam = params.get("cam")?.split(",").map(Number);
    if (cam && cam.length === 6) this.renderer.show.fixed = { from: new THREE.Vector3(cam[0], cam[1], cam[2]), at: new THREE.Vector3(cam[3], cam[4], cam[5]) };
    // The lab is seen from the front and to one side, past the end of the base wall.
    else if (this.lab) this.renderer.show.fixed = { from: new THREE.Vector3(4.6, 2.2, -22.4), at: new THREE.Vector3(-0.6, 1, -28.4) };
    // Sized now, so the cameras run up to a still with the view's real shape.
    this.renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    const at = Number(params.get("at")) || 0;
    this.still = at > 0;
    for (let t = 0; t < at; t += FILMED_FRAME) this.draw(FILMED_FRAME, false);
    if (this.still) this.exposeFilm();
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
    this.draw(gap > STALL ? FILMED_FRAME : gap, true);
  }

  /** Steps the battle by a slice of time and draws it (or only animates, for a run up to a still). */
  private draw(dt: number, show: boolean): void {
    this.carry += dt;
    const events: BattleEvent[] = [];
    while (this.carry >= STEP) {
      this.carry -= STEP;
      events.push(...(this.lab ? this.lab.step() : this.battle.step()));
    }
    this.renderer.onEvents(events);
    this.wall += dt;
    if (show) this.renderer.render(this.panes, dt, this.wall);
    else this.renderer.animate(dt, this.wall, this.panes);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
